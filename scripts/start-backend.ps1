# D^t Quality Roadmap - Backend (PowerShell)
$Host.UI.RawUI.WindowTitle = "D^t Quality Roadmap - Backend"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  D^t Quality Roadmap - Backend" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $PSScriptRoot\..\backend

if (-not (Test-Path .venv)) {
    Write-Host "[錯誤] 找不到虛擬環境，請先執行 setup.ps1" -ForegroundColor Red
    Read-Host "按 Enter 離開"
    exit 1
}

& .\.venv\Scripts\Activate.ps1

Write-Host "啟動 Backend 伺服器..." -ForegroundColor Yellow
Write-Host ""
Write-Host "  URL:      " -NoNewline; Write-Host "http://localhost:8000" -ForegroundColor Cyan
Write-Host "  API Docs: " -NoNewline; Write-Host "http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "按 Ctrl+C 停止伺服器" -ForegroundColor Gray
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

uvicorn app.main:app --reload --port 8000
