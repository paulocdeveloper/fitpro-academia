# Push main + validar remoto (requer gh auth ou credenciais GitHub)
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "=== Git push origin/main ===" -ForegroundColor Cyan
gh auth status 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "GitHub CLI nao logado. Execute:" -ForegroundColor Yellow
  Write-Host "  gh auth login -h github.com -p https -w"
  exit 1
}

git push origin main
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "`nCommits no remoto:" -ForegroundColor Green
git log origin/main -1 --oneline
git show origin/main:app/api/health/route.ts 2>$null | Select-Object -First 1
if ($LASTEXITCODE -eq 0) { Write-Host "OK: /api/health existe em origin/main" -ForegroundColor Green }
