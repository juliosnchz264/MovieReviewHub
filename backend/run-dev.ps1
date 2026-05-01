# backend/run-dev.ps1
Get-Content .env | ForEach-Object {
    if ($_ -match '^\s*([A-Z_][A-Z0-9_]*)\s*=\s*"?(.+?)"?\s*$') {
        [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], 'Process')
    }
}
.\mvnw spring-boot:run 2>&1 | Tee-Object -FilePath backend.log

