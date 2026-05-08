# seed-tmdb.ps1
#
# Importa en bulk peliculas y series desde TMDB hacia el catalogo local
# llamando a los endpoints admin del backend:
#   POST /api/v1/admin/tmdb/import/{tmdbId}
#   POST /api/v1/admin/tmdb/tv/import/{tmdbId}
#
# La fuente de IDs es TMDB directamente (popular movies + popular tv) paginada.
# Los endpoints del backend son idempotentes (unique index en tmdb_id), asi que
# correr el script varias veces no duplica nada.
#
# Requiere:
#   - $env:TMDB_API_KEY = v4 read access token (mismo que usa el backend)
#   - Un usuario admin existente en la API destino
#
# Uso:
#   $env:TMDB_API_KEY = "eyJ..."
#   .\seed-tmdb.ps1 -AdminEmail "admin@example.com" -AdminPassword "secret"
#   .\seed-tmdb.ps1 -ApiUrl "https://moviereviewhub-backend.onrender.com/api/v1" `
#                   -AdminEmail "admin@example.com" -AdminPassword "secret" `
#                   -MoviePages 5 -SeriesPages 5

param(
    [string]$ApiUrl = "http://localhost:8080/api/v1",
    [Parameter(Mandatory = $true)]
    [string]$AdminEmail,
    [Parameter(Mandatory = $true)]
    [string]$AdminPassword,
    [int]$MoviePages = 10,
    [int]$SeriesPages = 10,
    [int]$DelayMs = 250
)

$ErrorActionPreference = "Continue"

$TmdbKey = $env:TMDB_API_KEY
if ([string]::IsNullOrWhiteSpace($TmdbKey)) {
    Write-Host "ERROR: `$env:TMDB_API_KEY no esta definida." -ForegroundColor Red
    Write-Host "       Set it first:  `$env:TMDB_API_KEY = 'eyJ...'" -ForegroundColor Yellow
    exit 1
}

$TmdbBase = "https://api.themoviedb.org/3"
$TmdbHeaders = @{
    Authorization = "Bearer $TmdbKey"
    Accept        = "application/json"
}

# ---------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------
function Invoke-Tmdb {
    param([string]$Path, [hashtable]$Query = @{})
    $qs = ($Query.GetEnumerator() | ForEach-Object { "$($_.Key)=$([uri]::EscapeDataString([string]$_.Value))" }) -join "&"
    $uri = if ($qs) { "$TmdbBase$Path`?$qs" } else { "$TmdbBase$Path" }
    return Invoke-RestMethod -Method GET -Uri $uri -Headers $TmdbHeaders -ErrorAction Stop
}

function Invoke-Api {
    param(
        [string]$Method,
        [string]$Path,
        [object]$Body,
        [hashtable]$Headers = @{}
    )
    $params = @{
        Method      = $Method
        Uri         = "$ApiUrl$Path"
        Headers     = $Headers
        ContentType = "application/json"
        ErrorAction = "Stop"
    }
    if ($Body) { $params.Body = ($Body | ConvertTo-Json -Compress) }
    return Invoke-RestMethod @params
}

# ---------------------------------------------------------------
# 1. Login admin
# ---------------------------------------------------------------
Write-Host "==> Login as $AdminEmail" -ForegroundColor Cyan
try {
    $login = Invoke-Api -Method POST -Path "/auth/login" -Body @{
        email    = $AdminEmail
        password = $AdminPassword
    }
    $token = $login.accessToken
} catch {
    Write-Host "    login FAIL: $($_.ErrorDetails.Message)" -ForegroundColor Red
    exit 1
}
$authHeaders = @{ Authorization = "Bearer $token" }
Write-Host "    OK" -ForegroundColor Green

# ---------------------------------------------------------------
# 2. Sanity-check TMDB key
# ---------------------------------------------------------------
Write-Host "==> Probing TMDB" -ForegroundColor Cyan
try {
    $probe = Invoke-Tmdb -Path "/movie/popular" -Query @{ language = "en-US"; page = 1 }
    Write-Host "    TMDB OK ($($probe.total_results) total popular movies)" -ForegroundColor Green
} catch {
    Write-Host "    TMDB FAIL: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# ---------------------------------------------------------------
# 3. Generic importer
# ---------------------------------------------------------------
function Import-FromTmdb {
    param(
        [string]$Label,         # "movie" / "series"
        [string]$TmdbListPath,  # "/movie/popular" / "/tv/popular"
        [string]$ImportPath,    # "/admin/tmdb/import" / "/admin/tmdb/tv/import"
        [int]$Pages
    )

    Write-Host ""
    Write-Host "==> Importing $Label ($Pages pages)" -ForegroundColor Cyan

    $imported = 0
    $skipped  = 0
    $failed   = 0
    $seenIds  = New-Object System.Collections.Generic.HashSet[long]

    for ($p = 1; $p -le $Pages; $p++) {
        try {
            $page = Invoke-Tmdb -Path $TmdbListPath -Query @{ language = "en-US"; page = $p }
        } catch {
            Write-Host "    page $p TMDB FAIL: $($_.Exception.Message)" -ForegroundColor Red
            continue
        }

        $items = $page.results
        if (-not $items) {
            Write-Host "    page $p empty" -ForegroundColor DarkYellow
            continue
        }

        Write-Host "  -- page $p ($($items.Count) items)" -ForegroundColor Gray

        foreach ($it in $items) {
            $id = [long]$it.id
            if (-not $seenIds.Add($id)) { continue }  # dedupe entre paginas

            $title = if ($it.title) { $it.title } else { $it.name }

            try {
                Invoke-Api -Method POST -Path "$ImportPath/$id" -Headers $authHeaders | Out-Null
                $imported++
                Write-Host "     + $title (tmdb=$id)" -ForegroundColor Green
            } catch {
                $msg    = $_.ErrorDetails.Message
                $status = $null
                if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }

                # 409 (ya existe) o mensaje "already" -> skip silencioso
                if ($status -eq 409 -or $msg -match "already") {
                    $skipped++
                    Write-Host "     . $title (tmdb=$id) ya existe" -ForegroundColor DarkGray
                } else {
                    $failed++
                    Write-Host "     x $title (tmdb=$id) FAIL: $msg" -ForegroundColor Red
                }
            }

            if ($DelayMs -gt 0) { Start-Sleep -Milliseconds $DelayMs }
        }
    }

    return [PSCustomObject]@{
        Label    = $Label
        Imported = $imported
        Skipped  = $skipped
        Failed   = $failed
    }
}

# ---------------------------------------------------------------
# 4. Run
# ---------------------------------------------------------------
$movieResult  = Import-FromTmdb -Label "movies" -TmdbListPath "/movie/popular" -ImportPath "/admin/tmdb/import"    -Pages $MoviePages
$seriesResult = Import-FromTmdb -Label "series" -TmdbListPath "/tv/popular"    -ImportPath "/admin/tmdb/tv/import" -Pages $SeriesPages

# ---------------------------------------------------------------
# Resumen
# ---------------------------------------------------------------
Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "TMDB bulk seed complete" -ForegroundColor Cyan
foreach ($r in @($movieResult, $seriesResult)) {
    Write-Host ("  {0,-7} imported={1,-4} skipped={2,-4} failed={3}" -f $r.Label, $r.Imported, $r.Skipped, $r.Failed) -ForegroundColor Green
}
Write-Host "=================================" -ForegroundColor Cyan
