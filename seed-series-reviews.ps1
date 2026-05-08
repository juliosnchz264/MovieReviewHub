# seed-series-reviews.ps1
#
# Crea usuarios de prueba con reviews + favoritos randomizados sobre SERIES.
# Mismo patron que seed-users.ps1, pero apunta a /series/{id}/reviews y
# /users/me/series-favorites/{id}.
#
# Uso:
#   .\seed-series-reviews.ps1                                                    # contra localhost
#   .\seed-series-reviews.ps1 -ApiUrl "https://moviereviewhub-backend.onrender.com/api/v1"
#   .\seed-series-reviews.ps1 -UserCount 20 -ReviewsPerUser 5

param(
    [string]$ApiUrl = "http://localhost:8080/api/v1",
    [int]$UserCount = 15,
    [int]$ReviewsPerUser = 5,
    [int]$FavoritesPerUser = 4,
    [string]$Password = "password123"
)

$ErrorActionPreference = "Continue"

# ---------------------------------------------------------------
# Pool de comentarios variados para reviews de series
# ---------------------------------------------------------------
$comments = @(
    "Bingewatched the whole season in two days.",
    "Character development across episodes is top tier.",
    "First season was gold, hope they keep the pace.",
    "Slow start but episode 4 hooked me.",
    "Best ensemble cast on TV right now.",
    "Cliffhangers done right.",
    "The writing dropped off mid-season.",
    "Worth every episode. Cant wait for the next one.",
    "Ambient score does a lot of heavy lifting.",
    "Felt like an extended movie — in a good way.",
    "Some filler episodes but the main arc delivers.",
    "Pilot didnt sell me but glad I stuck with it.",
    "Production values rival cinema.",
    "Tight 8-episode season with no fat.",
    "Predictable plot but charming execution.",
    "Best show Ive seen this year.",
    "Genre-bending in the best way possible.",
    "Wish they had not extended it past S2.",
    "Underrated. Tell your friends.",
    "Strong premise, weak ending.",
    $null  # algunas reviews sin comentario
)

$firstNames = @("Alex","Sam","Jordan","Taylor","Casey","Morgan","Riley","Avery","Quinn","Blake","Drew","Sage","Reese","Skyler","Parker")
$lastNames  = @("Lee","Kim","Chen","Patel","Nguyen","Garcia","Silva","Cohen","Muller","Park","Smith","Khan","Davis","Brown","Wilson")

# ---------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------
function Invoke-Api {
    param(
        [string]$Method,
        [string]$Path,
        [object]$Body,
        [hashtable]$Headers = @{}
    )
    $uri = "$ApiUrl$Path"
    $params = @{
        Method = $Method
        Uri = $uri
        Headers = $Headers
        ContentType = "application/json"
        ErrorAction = "Stop"
    }
    if ($Body) {
        $params.Body = ($Body | ConvertTo-Json -Compress)
    }
    return Invoke-RestMethod @params
}

# ---------------------------------------------------------------
# 1. Listar series existentes (paginado)
# ---------------------------------------------------------------
Write-Host "==> Fetching series catalog..." -ForegroundColor Cyan
try {
    $page = Invoke-Api -Method GET -Path "/series?size=200&sort=firstAirDate,desc"
} catch {
    Write-Host "FAIL fetching series: $_" -ForegroundColor Red
    exit 1
}

$series = $page.content
if ($series.Count -lt 5) {
    Write-Host "Need at least 5 series in catalog. Found $($series.Count). Importa series desde TMDB primero." -ForegroundColor Red
    exit 1
}
Write-Host "    catalog has $($series.Count) series" -ForegroundColor Green

# ---------------------------------------------------------------
# 2. Crear usuarios + login + reviews + favoritos
# ---------------------------------------------------------------
$createdUsers = 0
$createdReviews = 0
$createdFavs = 0

for ($i = 1; $i -le $UserCount; $i++) {
    $first = $firstNames | Get-Random
    $last  = $lastNames | Get-Random
    # prefijo "tv" + timestamp para no colisionar con seed-users.ps1
    $username = "tv$first$last$i".ToLower()
    $email = "$username@test.com"

    Write-Host ""
    Write-Host "==> User $i/$UserCount : $username" -ForegroundColor Cyan

    # Register
    try {
        Invoke-Api -Method POST -Path "/auth/register" -Body @{
            username = $username
            email    = $email
            password = $Password
        } | Out-Null
        Write-Host "    registered" -ForegroundColor Green
    } catch {
        $msg = $_.ErrorDetails.Message
        if ($msg -like "*already in use*") {
            Write-Host "    already exists, skipping register" -ForegroundColor Yellow
        } else {
            Write-Host "    register FAIL: $msg" -ForegroundColor Red
            continue
        }
    }

    # Login
    try {
        $login = Invoke-Api -Method POST -Path "/auth/login" -Body @{
            email    = $email
            password = $Password
        }
        $token = $login.accessToken
    } catch {
        Write-Host "    login FAIL: $($_.ErrorDetails.Message)" -ForegroundColor Red
        continue
    }

    $h = @{ Authorization = "Bearer $token" }
    $createdUsers++

    # Pick random distinct series for this user
    $reviewSeries = $series | Get-Random -Count ([Math]::Min($ReviewsPerUser, $series.Count))
    $favSeries    = $series | Get-Random -Count ([Math]::Min($FavoritesPerUser, $series.Count))

    # Reviews
    foreach ($s in $reviewSeries) {
        $rating = Get-Random -Minimum 2 -Maximum 6  # 2..5 (sesgo positivo)
        if ((Get-Random -Maximum 10) -lt 2) { $rating = Get-Random -Minimum 1 -Maximum 3 }  # 20% reviews bajas
        $comment = $comments | Get-Random
        $body = @{ rating = $rating }
        if ($comment) { $body.comment = $comment }

        try {
            Invoke-Api -Method POST -Path "/series/$($s.id)/reviews" -Body $body -Headers $h | Out-Null
            $createdReviews++
        } catch {
            $msg = $_.ErrorDetails.Message
            if ($msg -notlike "*already reviewed*") {
                Write-Host "    review FAIL on $($s.title): $msg" -ForegroundColor DarkRed
            }
        }
    }

    # Favorites
    foreach ($s in $favSeries) {
        try {
            Invoke-Api -Method POST -Path "/users/me/series-favorites/$($s.id)" -Headers $h | Out-Null
            $createdFavs++
        } catch {
            # 4xx ignorable (ya favorito, etc.)
        }
    }

    Write-Host "    +$($reviewSeries.Count) reviews, +$($favSeries.Count) favorites" -ForegroundColor Gray
}

# ---------------------------------------------------------------
# Resumen
# ---------------------------------------------------------------
Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Seed series reviews complete" -ForegroundColor Cyan
Write-Host "  users    : $createdUsers" -ForegroundColor Green
Write-Host "  reviews  : $createdReviews" -ForegroundColor Green
Write-Host "  favorites: $createdFavs" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Test logins (password='$Password'):"
Write-Host "  tv<name><n>@test.com (e.g. tvalexkim1@test.com)"
