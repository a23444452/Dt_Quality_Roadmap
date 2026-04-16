# D^t Quality Roadmap - 首次設定 (PowerShell)
$ErrorActionPreference = "Stop"
$Host.UI.RawUI.WindowTitle = "D^t Quality Roadmap Setup"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  D^t Quality Roadmap - 首次設定" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $PSScriptRoot\..

# 檢查 Python
try {
    $pythonVersion = python --version 2>&1
    Write-Host "[OK] $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "[錯誤] 找不到 Python，請先安裝 Python 3.11+" -ForegroundColor Red
    Write-Host "下載: https://www.python.org/downloads/" -ForegroundColor Yellow
    Read-Host "按 Enter 離開"
    exit 1
}

# 檢查 Node.js
try {
    $nodeVersion = node --version 2>&1
    Write-Host "[OK] Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[錯誤] 找不到 Node.js，請先安裝 Node.js 20+" -ForegroundColor Red
    Write-Host "下載: https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "按 Enter 離開"
    exit 1
}

Write-Host ""
Write-Host "[1/6] 建立 Python 虛擬環境..." -ForegroundColor Yellow
Set-Location backend
if (-not (Test-Path .venv)) {
    python -m venv .venv
}

Write-Host "[2/6] 啟動虛擬環境並安裝 Backend 依賴..." -ForegroundColor Yellow
& .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt --quiet

Write-Host "[3/6] 建立環境變數檔..." -ForegroundColor Yellow
if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
    Write-Host "[提示] 已建立 backend\.env，請編輯設定 JWT_SECRET" -ForegroundColor Magenta
}

Write-Host "[4/6] 執行資料庫遷移..." -ForegroundColor Yellow
alembic upgrade head

Write-Host "[5/6] 載入範例資料..." -ForegroundColor Yellow
python -m app.seed

Set-Location ..

Write-Host "[6/6] 安裝 Frontend 依賴..." -ForegroundColor Yellow
Set-Location frontend
npm install

Set-Location ..

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  設定完成！" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "執行以下指令啟動開發伺服器:" -ForegroundColor White
Write-Host "  .\scripts\start-dev.ps1" -ForegroundColor Cyan
Write-Host ""
Write-Host "或分別啟動:" -ForegroundColor White
Write-Host "  .\scripts\start-backend.ps1" -ForegroundColor Cyan
Write-Host "  .\scripts\start-frontend.ps1" -ForegroundColor Cyan
Write-Host ""
Read-Host "按 Enter 離開"
