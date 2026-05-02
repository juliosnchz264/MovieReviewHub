# seed-users.ps1
#
# Crea usuarios de prueba con reviews + favoritos randomizados.
# Uso:
#   .\seed-users.ps1                                    # contra localhost
#   .\seed-users.ps1 -ApiUrl "https://render.com/api/v1"  # contra prod
#   .\seed-users.ps1 -UserCount 20 -ReviewsPerUser 5

param(
    [string]$ApiUrl = "http://localhost:8080/api/v1",
    [int]$UserCount = 15,
    [int]$ReviewsPerUser = 5,
    [int]$FavoritesPerUser = 4,
    [string]$Password = "password123"
)

$ErrorActionPreference = "Continue"

# ---------------------------------------------------------------
# Pool de comentarios variados para reviews
# ---------------------------------------------------------------
$comments = @(
    "Absolutely loved every minute of it.",
    "A masterpiece. Cinematography on another level.",
    "Solid story, characters felt real.",
    "Decent watch, nothing groundbreaking.",
    "Pacing was off in the second act.",
    "Worth the hype. Would watch again.",
    "Surprisingly emotional ending.",
    "Performances carried the whole film.",
    "Visually stunning but plot felt thin.",
    "One of the best in its genre.",
    "Underrated. Deserves more attention.",
    "Felt too long, could have used a tighter cut.",
    "Soundtrack alone is worth the watch.",
    "Refreshing take, didn't see the twists coming.",
    "Mediocre. Forgettable in a week.",
    "Beautiful little gem. Recommended.",
    "Started strong, lost steam by the end.",
    "Re-watched it three times already.",
    "Great direction, weak script.",
    "Made me think for days after.",
    $null  # algunas reviews sin comentario
)

$firstNames = @("Alex","Sam","Jordan","Taylor","Casey","Morgan","Riley","Avery","Quinn","Blake","Drew","Sage","Reese","Skyler","Parker")
$lastNames  = @("Lee","Kim","Chen","Patel","Nguyen","Garcia","Silva","Cohen","Müller","Park","Smith","Khan","Davis","Brown","Wilson")

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
# 1. Listar peliculas existentes (paginado)
# ---------------------------------------------------------------
Write-Host "==> Fetching catalog..." -ForegroundColor Cyan
try {
    $page = Invoke-Api -Method GET -Path "/movies?size=200&sort=releaseDate,desc"
} catch {
    Write-Host "FAIL fetching movies: $_" -ForegroundColor Red
    exit 1
}

$movies = $page.content
if ($movies.Count -lt 5) {
    Write-Host "Need at least 5 movies in catalog. Found $($movies.Count). Run seed-movies.ps1 first." -ForegroundColor Red
    exit 1
}
Write-Host "    catalog has $($movies.Count) movies" -ForegroundColor Green

# ---------------------------------------------------------------
# 2. Crear usuarios + login + reviews + favoritos
# ---------------------------------------------------------------
$createdUsers = 0
$createdReviews = 0
$createdFavs = 0

for ($i = 1; $i -le $UserCount; $i++) {
    $first = $firstNames | Get-Random
    $last  = $lastNames | Get-Random
    $username = "$first$last$i".ToLower()
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

    # Pick random distinct movies for this user
    $reviewMovies = $movies | Get-Random -Count ([Math]::Min($ReviewsPerUser, $movies.Count))
    $favMovies    = $movies | Get-Random -Count ([Math]::Min($FavoritesPerUser, $movies.Count))

    # Reviews
    foreach ($movie in $reviewMovies) {
        $rating = Get-Random -Minimum 2 -Maximum 6  # 2..5 (sesgo positivo)
        if ((Get-Random -Maximum 10) -lt 2) { $rating = Get-Random -Minimum 1 -Maximum 3 }  # 20% reviews bajas
        $comment = $comments | Get-Random
        $body = @{ rating = $rating }
        if ($comment) { $body.comment = $comment }

        try {
            Invoke-Api -Method POST -Path "/movies/$($movie.id)/reviews" -Body $body -Headers $h | Out-Null
            $createdReviews++
        } catch {
            $msg = $_.ErrorDetails.Message
            if ($msg -notlike "*already reviewed*") {
                Write-Host "    review FAIL on $($movie.title): $msg" -ForegroundColor DarkRed
            }
        }
    }

    # Favorites
    foreach ($movie in $favMovies) {
        try {
            Invoke-Api -Method POST -Path "/users/me/favorites/$($movie.id)" -Headers $h | Out-Null
            $createdFavs++
        } catch {
            # 4xx ignorable
        }
    }

    Write-Host "    +$($reviewMovies.Count) reviews, +$($favMovies.Count) favorites" -ForegroundColor Gray
}

# ---------------------------------------------------------------
# Resumen
# ---------------------------------------------------------------
Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Seed complete" -ForegroundColor Cyan
Write-Host "  users    : $createdUsers" -ForegroundColor Green
Write-Host "  reviews  : $createdReviews" -ForegroundColor Green
Write-Host "  favorites: $createdFavs" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Test logins (password='$Password'):"
Write-Host "  any of test users created above (e.g. <name><n>@test.com)"
