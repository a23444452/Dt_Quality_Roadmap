# D^t Solution Roadmap - 生產環境 (PowerShell)
$Host.UI.RawUI.WindowTitle = "D^t Solution Roadmap - Production"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  D^t Solution Roadmap - 生產環境" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $PSScriptRoot\..\backend

if (-not (Test-Path .venv)) {
    Write-Host "[錯誤] 找不到虛擬環境，請先執行 setup.ps1" -ForegroundColor Red
    Read-Host "按 Enter 離開"
    exit 1
}

& .\.venv\Scripts\Activate.ps1

Write-Host "啟動生產環境伺服器 (多 Worker 模式)..." -ForegroundColor Yellow
Write-Host ""
Write-Host "  URL:      " -NoNewline; Write-Host "http://localhost:8000" -ForegroundColor Cyan
Write-Host "  API Docs: " -NoNewline; Write-Host "http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "  Workers:  " -NoNewline; Write-Host "自動偵測 CPU 核心數" -ForegroundColor Cyan
Write-Host ""
Write-Host "按 Ctrl+C 停止伺服器" -ForegroundColor Gray
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

gunicorn app.main:app -c gunicorn.conf.py
