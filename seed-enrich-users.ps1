#!/usr/bin/env pwsh
# seed-enrich-users.ps1
#
# Enriches every existing non-admin, non-banned user with a believable profile:
# bio, theme color, handle, social links, avatar, country/timezone, plus
# realistic activity (ratings, reviews, favorites, public lists).
#
# Uses the public REST API exclusively. Mints a per-user JWT via the admin
# /impersonate endpoint (avoids burning the /auth/login rate-limit bucket
# and leaves the user's real password untouched), performs writes, moves on.
# No DB writes; all data goes through validation + auditing.
#
# Idempotency: a user is considered "already enriched" if their public profile
# returns a non-null bio. Use -Force to re-enrich anyway (new bio, more
# activity). Reviews/favorites/list-items that already exist are skipped on
# 409 silently.
#
# Usage (Linux):
#   pwsh ./seed-enrich-users.ps1 \
#       -AdminEmail admin@local.test -AdminPassword 'changeme' \
#       [-ApiUrl https://moviereviewhub-backend.onrender.com/api/v1] \
#       [-SeedPassword 'Seeded#2026'] [-Force] [-MaxUsers 50] [-RequestDelayMs 75]
#
# Notes:
#   - Bucket4j on the backend rate-limits aggressive callers. Increase
#     -RequestDelayMs to 200+ if hitting 429.
#   - The script tracks uniqueness *within a single run*: bios, handles,
#     social usernames, list titles, and review comments will not collide
#     among the users it touches in this invocation. Across runs, the bio
#     pool template-fills with random tokens so repeats are extremely rare.

param(
    [string]$ApiUrl         = "http://localhost:8080/api/v1",
    [Parameter(Mandatory=$true)][string]$AdminEmail,
    [Parameter(Mandatory=$true)][string]$AdminPassword,
    [string]$SeedPassword   = "Seeded#2026",
    [int]$MaxUsers          = 0,        # 0 = all
    [int]$RequestDelayMs    = 75,
    [switch]$Force,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12

# ============================================================================
# Content pools
# ============================================================================

$cities = @(
    "Madrid","Barcelona","Lisbon","Porto","Berlin","Munich","Hamburg","Vienna",
    "Amsterdam","Rotterdam","Brussels","Paris","Lyon","Marseille","Milan","Rome",
    "Naples","Florence","Athens","Prague","Warsaw","Krakow","Budapest","Copenhagen",
    "Stockholm","Helsinki","Oslo","Dublin","Edinburgh","London","Manchester",
    "Zurich","Geneva","Tallinn","Riga","Vilnius","Belgrade","Zagreb","Sofia",
    "Bucharest","Istanbul","Tel Aviv","Cairo","Cape Town","Mumbai","Bangalore",
    "Delhi","Singapore","Tokyo","Osaka","Seoul","Taipei","Hong Kong","Bangkok",
    "Manila","Jakarta","Sydney","Melbourne","Auckland","Vancouver","Toronto",
    "Montreal","New York","Brooklyn","Chicago","Austin","Portland","San Francisco",
    "Los Angeles","Mexico City","Bogota","Lima","Buenos Aires","Santiago",
    "Sao Paulo","Rio de Janeiro"
)

# (countryCode, defaultTimezone) — kept loose; backend validates timezone against ZoneId.
$locales = @(
    @{ cc = "ES"; tz = "Europe/Madrid" },
    @{ cc = "PT"; tz = "Europe/Lisbon" },
    @{ cc = "FR"; tz = "Europe/Paris" },
    @{ cc = "DE"; tz = "Europe/Berlin" },
    @{ cc = "IT"; tz = "Europe/Rome" },
    @{ cc = "GB"; tz = "Europe/London" },
    @{ cc = "IE"; tz = "Europe/Dublin" },
    @{ cc = "NL"; tz = "Europe/Amsterdam" },
    @{ cc = "BE"; tz = "Europe/Brussels" },
    @{ cc = "AT"; tz = "Europe/Vienna" },
    @{ cc = "CH"; tz = "Europe/Zurich" },
    @{ cc = "SE"; tz = "Europe/Stockholm" },
    @{ cc = "NO"; tz = "Europe/Oslo" },
    @{ cc = "DK"; tz = "Europe/Copenhagen" },
    @{ cc = "FI"; tz = "Europe/Helsinki" },
    @{ cc = "PL"; tz = "Europe/Warsaw" },
    @{ cc = "CZ"; tz = "Europe/Prague" },
    @{ cc = "GR"; tz = "Europe/Athens" },
    @{ cc = "TR"; tz = "Europe/Istanbul" },
    @{ cc = "US"; tz = "America/New_York" },
    @{ cc = "US"; tz = "America/Los_Angeles" },
    @{ cc = "CA"; tz = "America/Toronto" },
    @{ cc = "MX"; tz = "America/Mexico_City" },
    @{ cc = "BR"; tz = "America/Sao_Paulo" },
    @{ cc = "AR"; tz = "America/Argentina/Buenos_Aires" },
    @{ cc = "CL"; tz = "America/Santiago" },
    @{ cc = "JP"; tz = "Asia/Tokyo" },
    @{ cc = "KR"; tz = "Asia/Seoul" },
    @{ cc = "SG"; tz = "Asia/Singapore" },
    @{ cc = "AU"; tz = "Australia/Sydney" },
    @{ cc = "NZ"; tz = "Pacific/Auckland" }
)

$themeColors = @("default","rose","violet","indigo","blue","teal","green","amber","orange","red","slate")

$genres = @("Drama","Thriller","Horror","Sci-Fi","Comedy","Romance","Animation",
            "Documentary","Crime","Mystery","Fantasy","Action","Western","Noir",
            "indie","arthouse","slow-burn")

$decades = @("the 70s","the 80s","the 90s","the 2000s","the 2010s","the 2020s",
             "early Hollywood","silent cinema","post-war European cinema",
             "Hong Kong action era","the New Hollywood wave")

$adjectives = @("quiet","loud","weird","sincere","brutal","tender","slow",
                "kinetic","beautiful","strange","melancholic","sharp","sweaty",
                "dreamy","cold","grimy","sunny","claustrophobic")

# Bio templates with placeholders. Variety comes from random combinations +
# occasional opt-in extra sentences. Total practical pool size > 200k.
$bioTemplates = @(
    "Watching films since {decade}. {adj} stories over loud ones.",
    "{city}-based. Logs every {genre} I finish. Open to recs.",
    "Letterboxd refugee. Currently deep in {genre} from {decade}.",
    "{genre} is a feeling, not a genre. Based in {city}.",
    "Trying to watch one new film a week. {adj} ones preferred.",
    "Writes too-long reviews of {adj} {genre}. From {city}.",
    "Working through {decade} {genre} one weekend at a time.",
    "{adj} pacing is a feature, not a bug. {city}.",
    "Programmer by day, projectionist by mood. {city}.",
    "Will defend any {genre} film from {decade}.",
    "{adj} films + black coffee. {city} most weeks.",
    "Half my watchlist is unwatched. Help.",
    "Came for {genre}, stayed for the soundtracks.",
    "If it's {adj} and from {decade}, I'm in.",
    "{city}. Always rewatching something.",
    "Trying to convince friends that {decade} {genre} aged better than they think.",
    "Subtitles enthusiast. {city}.",
    "Notes app full of half-finished reviews.",
    "Movie tickets > concert tickets.",
    "Catching up on everything I missed in {decade}.",
    "Currently obsessed with {adj} {genre}.",
    "{city}. Letterboxd handle is private, sorry.",
    "Will rate anything below 2 stars if it earns it.",
    "Believer in director's cuts.",
    "{adj} endings hit harder than happy ones.",
    "Owns way too many criterion blu-rays.",
    "{genre} > everything. Fight me.",
    "Quietly logging every theatre visit.",
    "Currently rewatching the entire filmography of someone I shouldn't admit.",
    "Lurker turned reviewer."
)

# Review comment pool — varied length, varied sentiment. Some entries are
# multi-sentence; sentiment buckets (positive/mixed/negative) are mapped to
# rating ranges in Get-CommentForRating.
$commentsPositive = @(
    "Knocked me out. Couldn't stop thinking about the third act.",
    "Crafted with so much care. The sound design alone earns the price.",
    "One of those rare ones where every scene feels intentional.",
    "Reminded me why I love this medium.",
    "Performances are absolutely committed. The lead carries it.",
    "Watched it twice in a week. Still finding details.",
    "Pacing is patient and earned. The payoff lands hard.",
    "A complete vision. Nothing wasted.",
    "Beautiful, unsentimental, and quietly devastating.",
    "Genuinely surprised by how much it stuck with me.",
    "Direction is so confident. Trust the slow build.",
    "Score is doing half the work and the work is incredible.",
    "If you let it breathe, it pays you back.",
    "Best thing I've watched in months.",
    "Quietly extraordinary. Don't read anything before going in.",
    "Funny, sad, alive. All in one scene sometimes.",
    "Felt like seeing the city for the first time.",
    "Every frame is composed. Could be paused into a poster.",
    "It's the small choices. Every actor knows what film they're in.",
    "Generous, not showy. Going back to it soon.",
    "Restored my faith in studio filmmaking.",
    "Loved the restraint. Says more with less.",
    "Could rewatch the opening forever.",
    "Lived in my head for a week."
)

$commentsMixed = @(
    "Loved chunks of it, lost interest in others. Worth a watch though.",
    "Beautifully shot but the script needed another pass.",
    "First hour is special. The rest can't quite keep up.",
    "Cast is doing great work in a film that doesn't quite earn them.",
    "Big swing, partial connect.",
    "Tonally messy in a way I sort of admired.",
    "Felt long even when I was enjoying it.",
    "Half-masterpiece, half-fine.",
    "Some scenes are killer. Some scenes shouldn't exist.",
    "Wanted more. Got enough to keep me curious about the director.",
    "Better in memory than in the moment.",
    "Sound mix made dialogue rough. Otherwise solid.",
    "Premise carries it more than the execution does.",
    "Charming when it works. Stilted when it doesn't.",
    "Glad I saw it once. Probably won't return.",
    "Mid-tier but with two scenes I'll think about for ages.",
    "Doesn't earn the runtime, but the leads are great.",
    "Watchable. Forgettable. Pleasant.",
    "Style over substance, but the style is enough most nights."
)

$commentsNegative = @(
    "Lost me by the second act. Didn't earn its ending.",
    "Style over substance and not enough style.",
    "Watched on a long flight. Felt longer than the flight.",
    "The premise deserved a better script.",
    "Edited like it doesn't trust the audience.",
    "Tries hard, lands flat.",
    "Stretched a short film into two hours.",
    "Didn't believe a single relationship in this.",
    "Score is doing too much heavy lifting.",
    "Forgot most of it by the next day.",
    "A drag. Even the action scenes feel polite.",
    "Hated the protagonist for the wrong reasons.",
    "Felt like four pilots stapled together.",
    "All vibes, no movie."
)

# List title templates — combined with random genre/decade/adjective tokens.
$listTitleTemplates = @(
    "Comfort {genre} for cold nights",
    "Best of {decade}",
    "{adj} {genre} that aged like wine",
    "First-watch list: {genre} essentials",
    "Underrated {genre} from {decade}",
    "Mind-bending watches",
    "{city} on screen",
    "{adj} films I rewatch",
    "{genre} that made me cry",
    "{genre} double-feature ideas",
    "Date night picks",
    "Halloween night",
    "Sunday afternoon picks",
    "Loud bar, no subtitles night",
    "End-of-year catch-up",
    "The {director-canon} starter pack",
    "Watchlist purgatory",
    "Films I rate higher than the consensus",
    "{adj} animation",
    "{adj} {genre} I keep recommending"
)

$listDescriptions = @(
    "Personal picks. Order matters a little, but not too much.",
    "Open list. Will keep adding as I find more.",
    "Curated over the last few years. Each one earned its spot.",
    "Less consensus, more conviction.",
    "What I send people when they ask 'what should I watch tonight?'",
    "A mood, not a ranking.",
    "Comfort over greatness. Sometimes both.",
    "For when the algorithm gets it wrong.",
    "Watch in order or shuffle, both work.",
    "Most of these reward patience.",
    "Skip the first 10 minutes of any of these and you'll regret it."
)

# DiceBear avatar styles. URL is https, validates against ^https://.*
$avatarStyles = @("notionists-neutral","lorelei-neutral","initials","thumbs",
                  "personas","adventurer-neutral","fun-emoji","big-smile")

# ============================================================================
# HTTP plumbing
# ============================================================================

function Invoke-Api {
    param(
        [Parameter(Mandatory=$true)][string]$Method,
        [Parameter(Mandatory=$true)][string]$Path,
        [object]$Body,
        [hashtable]$Headers
    )
    $h = @{ "Accept" = "application/json" }
    if ($Headers) { foreach ($k in $Headers.Keys) { $h[$k] = $Headers[$k] } }
    $url = "$ApiUrl$Path"
    $params = @{
        Method = $Method
        Uri    = $url
        Headers = $h
        ErrorAction = "Stop"
    }
    if ($null -ne $Body) {
        $params.ContentType = "application/json"
        $params.Body = (ConvertTo-Json -Depth 10 -Compress $Body)
    }
    if ($RequestDelayMs -gt 0) { Start-Sleep -Milliseconds $RequestDelayMs }
    return Invoke-RestMethod @params
}

function Try-Api {
    param(
        [Parameter(Mandatory=$true)][string]$Method,
        [Parameter(Mandatory=$true)][string]$Path,
        [object]$Body,
        [hashtable]$Headers,
        [int[]]$IgnoreStatus = @(409),
        [int]$Retry429 = 1
    )
    for ($attempt = 0; $attempt -le $Retry429; $attempt++) {
        try {
            return @{ ok = $true; data = (Invoke-Api -Method $Method -Path $Path -Body $Body -Headers $Headers); status = 200 }
        } catch {
            $resp = $_.Exception.Response
            $code = if ($resp) { [int]$resp.StatusCode } else { 0 }
            if ($code -eq 429 -and $attempt -lt $Retry429) {
                $retryAfter = 0
                try { $retryAfter = [int]$resp.Headers.RetryAfter.Delta.TotalSeconds } catch {}
                if ($retryAfter -le 0) { $retryAfter = 65 }
                Write-Host "        429, sleeping ${retryAfter}s..." -ForegroundColor DarkYellow
                Start-Sleep -Seconds $retryAfter
                continue
            }
            if ($IgnoreStatus -contains $code) {
                return @{ ok = $false; status = $code; ignored = $true }
            }
            return @{ ok = $false; status = $code; error = $_.ErrorDetails.Message ?? $_.Exception.Message }
        }
    }
}

# ============================================================================
# Helpers
# ============================================================================

function Get-Random-Item { param($Array) return $Array | Get-Random }

function New-RandomToken { param([int]$Length = 6)
    $chars = "abcdefghijklmnopqrstuvwxyz0123456789".ToCharArray()
    -join (1..$Length | ForEach-Object { $chars | Get-Random })
}

function Resolve-BioTemplate {
    param([string]$Template)
    $out = $Template
    $out = $out.Replace("{city}",    (Get-Random-Item $cities))
    $out = $out.Replace("{genre}",   (Get-Random-Item $genres))
    $out = $out.Replace("{decade}",  (Get-Random-Item $decades))
    $out = $out.Replace("{adj}",     (Get-Random-Item $adjectives))
    return $out
}

function New-UniqueBio {
    param([System.Collections.Generic.HashSet[string]]$Seen)
    for ($i = 0; $i -lt 25; $i++) {
        $tpl = Get-Random-Item $bioTemplates
        $base = Resolve-BioTemplate $tpl
        # 35% chance of appending a second short sentence for variety.
        if ((Get-Random -Maximum 100) -lt 35) {
            $tail = Resolve-BioTemplate (Get-Random-Item $bioTemplates)
            $bio = "$base $tail"
        } else {
            $bio = $base
        }
        if ($bio.Length -gt 480) { $bio = $bio.Substring(0, 480) }
        if ($Seen.Add($bio)) { return $bio }
    }
    # fallback: append random token
    return "$base ($(New-RandomToken 4))"
}

function Resolve-ListTitle {
    param([string]$Template)
    $out = $Template
    $out = $out.Replace("{city}",   (Get-Random-Item $cities))
    $out = $out.Replace("{genre}",  (Get-Random-Item $genres))
    $out = $out.Replace("{decade}", (Get-Random-Item $decades))
    $out = $out.Replace("{adj}",    (Get-Random-Item $adjectives))
    $out = $out.Replace("{director-canon}", (Get-Random-Item @("auteur","slow-cinema","mumblecore","blockbuster","arthouse")))
    if ($out.Length -gt 78) { $out = $out.Substring(0, 78) }
    return $out
}

function New-UniqueListTitle {
    param([System.Collections.Generic.HashSet[string]]$Seen)
    for ($i = 0; $i -lt 15; $i++) {
        $t = Resolve-ListTitle (Get-Random-Item $listTitleTemplates)
        if ($Seen.Add($t)) { return $t }
    }
    return "$t · $(New-RandomToken 3)"
}

function Get-CommentForRating {
    param([double]$Rating, [System.Collections.Generic.HashSet[string]]$Seen)
    # 20% chance no comment regardless of rating
    if ((Get-Random -Maximum 100) -lt 20) { return $null }
    $pool = if ($Rating -ge 4.0) { $commentsPositive }
            elseif ($Rating -ge 2.5) { $commentsMixed }
            else { $commentsNegative }
    for ($i = 0; $i -lt 20; $i++) {
        $c = Get-Random-Item $pool
        if ($Seen.Add($c)) { return $c }
    }
    return "$c — $(New-RandomToken 4)"
}

function New-Rating {
    # Half-step distribution skewed positive but with real spread.
    # Weights: 5.0=12, 4.5=18, 4.0=22, 3.5=18, 3.0=12, 2.5=7, 2.0=4, 1.5=3, 1.0=2, 0.5=2 -> 100
    $r = Get-Random -Maximum 100
    if     ($r -lt 12) { return 5.0 }
    elseif ($r -lt 30) { return 4.5 }
    elseif ($r -lt 52) { return 4.0 }
    elseif ($r -lt 70) { return 3.5 }
    elseif ($r -lt 82) { return 3.0 }
    elseif ($r -lt 89) { return 2.5 }
    elseif ($r -lt 93) { return 2.0 }
    elseif ($r -lt 96) { return 1.5 }
    elseif ($r -lt 98) { return 1.0 }
    else               { return 0.5 }
}

function New-Handle {
    param([string]$Username, [System.Collections.Generic.HashSet[string]]$Seen)
    $base = ($Username -replace "[^a-zA-Z0-9_.]", "").ToLower()
    if ($base.Length -lt 3) { $base = "user$base" }
    if ($base.Length -gt 24) { $base = $base.Substring(0, 24) }
    for ($i = 0; $i -lt 10; $i++) {
        $candidate = if ($i -eq 0) { $base } else { "$base.$(New-RandomToken 3)" }
        if ($candidate.Length -ge 3 -and $candidate.Length -le 30 -and $Seen.Add($candidate.ToLower())) {
            return $candidate
        }
    }
    return $null
}

function New-SocialUsername {
    param([string]$Seed, [System.Collections.Generic.HashSet[string]]$Seen)
    $base = ($Seed -replace "[^a-zA-Z0-9]", "").ToLower()
    if ($base.Length -lt 4) { $base = "movie$base" }
    if ($base.Length -gt 20) { $base = $base.Substring(0, 20) }
    for ($i = 0; $i -lt 8; $i++) {
        $candidate = if ($i -eq 0) { "$base$(Get-Random -Minimum 10 -Maximum 999)" }
                     else { "$base.$(New-RandomToken 4)" }
        if ($Seen.Add($candidate)) { return $candidate }
    }
    return "$base.$(New-RandomToken 6)"
}

function New-AvatarUrl {
    param([string]$Seed)
    $style = Get-Random-Item $avatarStyles
    $encoded = [uri]::EscapeDataString($Seed)
    return "https://api.dicebear.com/8.x/$style/svg?seed=$encoded"
}

function Get-All-Paged {
    param([string]$Path, [int]$PageSize = 100, [int]$MaxPages = 50, [hashtable]$Headers)
    $all = New-Object System.Collections.Generic.List[object]
    for ($p = 0; $p -lt $MaxPages; $p++) {
        $sep = if ($Path.Contains("?")) { "&" } else { "?" }
        $r = Invoke-Api -Method GET -Path "$Path${sep}page=$p&size=$PageSize" -Headers $Headers
        if ($null -eq $r.content) { break }
        foreach ($item in $r.content) { [void]$all.Add($item) }
        if ($r.last) { break }
    }
    return $all
}

# ============================================================================
# Phase 1: admin login + catalog fetch
# ============================================================================

Write-Host ""
Write-Host "==> API : $ApiUrl"   -ForegroundColor Cyan
Write-Host "==> Admin login as $AdminEmail" -ForegroundColor Cyan

$script:adminLoginAt = $null
$script:adminAuth = $null

function Refresh-AdminToken {
    $r = Invoke-Api -Method POST -Path "/auth/login" -Body @{
        email    = $AdminEmail
        password = $AdminPassword
    }
    if (-not $r.accessToken) { throw "Admin login did not return accessToken" }
    $script:adminAuth = @{ Authorization = "Bearer $($r.accessToken)" }
    $script:adminLoginAt = Get-Date
}

Refresh-AdminToken
$adminAuth = $script:adminAuth
Write-Host "    admin token acquired" -ForegroundColor Green

Write-Host "==> Loading user roster" -ForegroundColor Cyan
$allUsers = Get-All-Paged -Path "/admin/users" -PageSize 100 -Headers $adminAuth
$candidates = @($allUsers | Where-Object {
    $_.role -eq "ROLE_USER" -and -not $_.banned
})
Write-Host "    $($allUsers.Count) total, $($candidates.Count) candidates (non-admin, non-banned)" -ForegroundColor Green

if ($MaxUsers -gt 0 -and $candidates.Count -gt $MaxUsers) {
    $candidates = $candidates | Select-Object -First $MaxUsers
    Write-Host "    capped to $MaxUsers via -MaxUsers" -ForegroundColor Yellow
}

Write-Host "==> Loading movie + series catalog" -ForegroundColor Cyan
$movies = Get-All-Paged -Path "/movies" -PageSize 200
$series = Get-All-Paged -Path "/series" -PageSize 200
Write-Host "    movies=$($movies.Count) series=$($series.Count)" -ForegroundColor Green

if ($movies.Count -eq 0 -and $series.Count -eq 0) {
    throw "Catalog is empty. Run seed-tmdb.ps1 before enrichment."
}

# ============================================================================
# Per-run uniqueness trackers
# ============================================================================

$seenBios      = [System.Collections.Generic.HashSet[string]]::new()
$seenHandles   = [System.Collections.Generic.HashSet[string]]::new()
$seenIG        = [System.Collections.Generic.HashSet[string]]::new()
$seenTwitter   = [System.Collections.Generic.HashSet[string]]::new()
$seenTiktok    = [System.Collections.Generic.HashSet[string]]::new()
$seenFacebook  = [System.Collections.Generic.HashSet[string]]::new()

# Per-user trackers reset on each iteration; tracked aggregate for reporting.
$stats = @{
    enriched   = 0
    skipped    = 0
    reviews    = 0
    favorites  = 0
    lists      = 0
    listItems  = 0
    failures   = 0
}

# ============================================================================
# Phase 2: per-user enrichment
# ============================================================================

$idx = 0
foreach ($u in $candidates) {
    $idx++
    Write-Host ""
    Write-Host "==> [$idx/$($candidates.Count)] $($u.username) (id=$($u.id))" -ForegroundColor Cyan

    # Idempotency: skip if bio already set unless -Force.
    if (-not $Force) {
        try {
            $publicProfile = Invoke-Api -Method GET -Path "/users/$($u.id)/profile"
            if ($publicProfile.bio) {
                Write-Host "    bio already set, skipping (use -Force to overwrite)" -ForegroundColor DarkGray
                $stats.skipped++
                continue
            }
        } catch {
            Write-Host "    could not fetch profile (status=$($_.Exception.Response.StatusCode)), continuing" -ForegroundColor DarkYellow
        }
    }

    if ($DryRun) {
        Write-Host "    DRY-RUN: would enrich" -ForegroundColor Yellow
        $stats.enriched++
        continue
    }

    # Refresh admin token periodically (15-min JWT TTL, plus rate-limit budget).
    if (((Get-Date) - $script:adminLoginAt).TotalMinutes -ge 10) {
        Write-Host "    refreshing admin token (10min elapsed)" -ForegroundColor DarkGray
        try { Refresh-AdminToken; $adminAuth = $script:adminAuth }
        catch { Write-Host "    admin re-login FAIL: $($_.Exception.Message)" -ForegroundColor Red; break }
    }

    # Mint JWT for target user via admin impersonate (bypasses auth rate limit).
    $imp = Try-Api -Method POST -Path "/admin/users/$($u.id)/impersonate" `
                   -Headers $adminAuth -IgnoreStatus @()
    if (-not $imp.ok) {
        Write-Host "    impersonate FAIL (status=$($imp.status)): $($imp.error)" -ForegroundColor Red
        $stats.failures++
        continue
    }
    $userAuth = @{ Authorization = "Bearer $($imp.data.accessToken)" }

    # --------- Profile ---------
    $bio        = New-UniqueBio -Seen $seenBios
    $themeColor = Get-Random-Item $themeColors
    $handle     = New-Handle -Username $u.username -Seen $seenHandles
    $avatar     = New-AvatarUrl -Seed $u.username

    # Social links: opt-in per platform. Avg ~2 of 4.
    $profileBody = @{
        bio        = $bio
        themeColor = $themeColor
        avatarUrl  = $avatar
    }
    if ($handle) { $profileBody.handle = $handle }
    if ((Get-Random -Maximum 100) -lt 65) {
        $h = New-SocialUsername -Seed $u.username -Seen $seenTwitter
        $profileBody.socialTwitter = "https://x.com/$h"
    }
    if ((Get-Random -Maximum 100) -lt 55) {
        $h = New-SocialUsername -Seed "$($u.username)_ig" -Seen $seenIG
        $profileBody.socialInstagram = "https://instagram.com/$h"
    }
    if ((Get-Random -Maximum 100) -lt 25) {
        $h = New-SocialUsername -Seed "$($u.username)_tk" -Seen $seenTiktok
        $profileBody.socialTiktok = "https://tiktok.com/@$h"
    }
    if ((Get-Random -Maximum 100) -lt 15) {
        $h = New-SocialUsername -Seed "$($u.username)_fb" -Seen $seenFacebook
        $profileBody.socialFacebook = "https://facebook.com/$h"
    }

    $pr = Try-Api -Method PATCH -Path "/users/me/profile" -Body $profileBody -Headers $userAuth -IgnoreStatus @(409)
    if (-not $pr.ok -and -not $pr.ignored) {
        Write-Host "    profile patch FAIL: $($pr.error)" -ForegroundColor DarkRed
    } else {
        Write-Host "    profile updated (theme=$themeColor, handle=$handle)" -ForegroundColor Green
    }

    # --------- Settings (country/timezone) ---------
    $locale = Get-Random-Item $locales
    $settingsBody = @{ country = $locale.cc; timezone = $locale.tz; autodetectTimezone = $false }
    $sr = Try-Api -Method PATCH -Path "/users/me/settings" -Body $settingsBody -Headers $userAuth
    if ($sr.ok) {
        Write-Host "    locale set ($($locale.cc) / $($locale.tz))" -ForegroundColor DarkGreen
    }

    # --------- Reviews ---------
    $reviewBudget = Get-Random -Minimum 5 -Maximum 16   # 5..15 effective target
    # Mix movies + series in proportion to catalog sizes
    $movieShare = if (($movies.Count + $series.Count) -eq 0) { 1 } `
                  else { $movies.Count / ($movies.Count + $series.Count) }
    $movieReviewCount = [int][Math]::Min($movies.Count, [Math]::Round($reviewBudget * $movieShare))
    $seriesReviewCount = [Math]::Min($series.Count, $reviewBudget - $movieReviewCount)

    $seenComments = [System.Collections.Generic.HashSet[string]]::new()
    $reviewedMovies = if ($movieReviewCount -gt 0) { $movies | Get-Random -Count $movieReviewCount } else { @() }
    $reviewedSeries = if ($seriesReviewCount -gt 0) { $series | Get-Random -Count $seriesReviewCount } else { @() }

    foreach ($m in $reviewedMovies) {
        $rating  = New-Rating
        $comment = Get-CommentForRating -Rating $rating -Seen $seenComments
        $body = @{ rating = $rating }
        if ($comment) { $body.comment = $comment }
        $r = Try-Api -Method POST -Path "/movies/$($m.id)/reviews" -Body $body -Headers $userAuth
        if ($r.ok) { $stats.reviews++ }
    }
    foreach ($s in $reviewedSeries) {
        $rating  = New-Rating
        $comment = Get-CommentForRating -Rating $rating -Seen $seenComments
        $body = @{ rating = $rating }
        if ($comment) { $body.comment = $comment }
        $r = Try-Api -Method POST -Path "/series/$($s.id)/reviews" -Body $body -Headers $userAuth
        if ($r.ok) { $stats.reviews++ }
    }
    Write-Host "    reviews +$($reviewedMovies.Count) movies, +$($reviewedSeries.Count) series" -ForegroundColor Gray

    # Extra ratings beyond reviewBudget — total 5..30, but stored as reviews
    # with empty comment to keep distribution. We already counted reviews;
    # add a top-up pass with shorter cap so total per user is varied.
    $extraTarget = Get-Random -Minimum 0 -Maximum 16
    $extraMovies = if ($extraTarget -gt 0 -and $movies.Count -gt $reviewedMovies.Count) {
        $movies | Where-Object { $reviewedMovies.id -notcontains $_.id } |
            Get-Random -Count ([Math]::Min($extraTarget, $movies.Count - $reviewedMovies.Count))
    } else { @() }
    foreach ($m in $extraMovies) {
        $r = Try-Api -Method POST -Path "/movies/$($m.id)/reviews" `
                     -Body @{ rating = (New-Rating) } -Headers $userAuth
        if ($r.ok) { $stats.reviews++ }
    }

    # --------- Favorites ---------
    $favBudget = Get-Random -Minimum 2 -Maximum 11   # 2..10
    $favMovieCount = [int][Math]::Min($movies.Count, [Math]::Round($favBudget * $movieShare))
    $favSeriesCount = [Math]::Min($series.Count, $favBudget - $favMovieCount)
    $favMovies = if ($favMovieCount -gt 0) { $movies | Get-Random -Count $favMovieCount } else { @() }
    $favSeries = if ($favSeriesCount -gt 0) { $series | Get-Random -Count $favSeriesCount } else { @() }
    foreach ($m in $favMovies) {
        $r = Try-Api -Method POST -Path "/users/me/favorites/$($m.id)" -Headers $userAuth
        if ($r.ok) { $stats.favorites++ }
    }
    foreach ($s in $favSeries) {
        $r = Try-Api -Method POST -Path "/users/me/series-favorites/$($s.id)" -Headers $userAuth
        if ($r.ok) { $stats.favorites++ }
    }
    Write-Host "    favorites +$($favMovies.Count) movies, +$($favSeries.Count) series" -ForegroundColor Gray

    # --------- Public lists ---------
    $seenTitlesThisUser = [System.Collections.Generic.HashSet[string]]::new()
    $listCount = Get-Random -Minimum 1 -Maximum 5    # 1..4
    for ($l = 0; $l -lt $listCount; $l++) {
        $title = New-UniqueListTitle -Seen $seenTitlesThisUser
        $desc  = Get-Random-Item $listDescriptions
        $cr = Try-Api -Method POST -Path "/users/me/lists" -Headers $userAuth -Body @{
            title       = $title
            description = $desc
            visibility  = "PUBLIC"
        }
        if (-not $cr.ok) { continue }
        $stats.lists++
        $listId = $cr.data.id

        # 6..18 items per list, mixed movies + series
        $itemBudget = Get-Random -Minimum 6 -Maximum 19
        $itemMovieCount = [int][Math]::Min($movies.Count, [Math]::Round($itemBudget * $movieShare))
        $itemSeriesCount = [Math]::Min($series.Count, $itemBudget - $itemMovieCount)
        $listMovies = if ($itemMovieCount -gt 0) { $movies | Get-Random -Count $itemMovieCount } else { @() }
        $listSeries = if ($itemSeriesCount -gt 0) { $series | Get-Random -Count $itemSeriesCount } else { @() }
        foreach ($m in $listMovies) {
            $r = Try-Api -Method POST -Path "/lists/$listId/items" -Headers $userAuth -Body @{
                kind = "MOVIE"; targetId = $m.id
            }
            if ($r.ok) { $stats.listItems++ }
        }
        foreach ($s in $listSeries) {
            $r = Try-Api -Method POST -Path "/lists/$listId/items" -Headers $userAuth -Body @{
                kind = "SERIES"; targetId = $s.id
            }
            if ($r.ok) { $stats.listItems++ }
        }
    }
    Write-Host "    +$listCount public lists" -ForegroundColor Gray

    $stats.enriched++
}

# ============================================================================
# Summary
# ============================================================================

Write-Host ""
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Enrichment complete"                 -ForegroundColor Cyan
Write-Host "  enriched     : $($stats.enriched)" -ForegroundColor Green
Write-Host "  skipped      : $($stats.skipped)"  -ForegroundColor DarkGray
Write-Host "  failures     : $($stats.failures)" -ForegroundColor $(if ($stats.failures -gt 0) {"Red"} else {"DarkGray"})
Write-Host "  reviews      : $($stats.reviews)"  -ForegroundColor Green
Write-Host "  favorites    : $($stats.favorites)" -ForegroundColor Green
Write-Host "  public lists : $($stats.lists) (with $($stats.listItems) items)" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Existing user passwords were NOT modified (impersonation used)." -ForegroundColor DarkGray
