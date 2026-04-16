# D^t Quality Roadmap - Frontend (PowerShell)
$Host.UI.RawUI.WindowTitle = "D^t Quality Roadmap - Frontend"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  D^t Quality Roadmap - Frontend" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $PSScriptRoot\..\frontend

if (-not (Test-Path node_modules)) {
    Write-Host "[錯誤] 找不到 node_modules，請先執行 setup.ps1" -ForegroundColor Red
    Read-Host "按 Enter 離開"
    exit 1
}

Write-Host "啟動 Frontend 開發伺服器..." -ForegroundColor Yellow
Write-Host ""
Write-Host "  URL: " -NoNewline; Write-Host "http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "按 Ctrl+C 停止伺服器" -ForegroundColor Gray
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

npm run dev
