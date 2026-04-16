@echo off
chcp 65001 >nul
echo ============================================
echo   D^t Quality Roadmap - Backend
echo ============================================
echo.

cd /d "%~dp0..\backend"

if not exist .venv (
    echo [錯誤] 找不到虛擬環境，請先執行 setup.bat
    pause
    exit /b 1
)

call .venv\Scripts\activate.bat

echo 啟動 Backend 伺服器...
echo.
echo   URL:      http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo.
echo 按 Ctrl+C 停止伺服器
echo ============================================
echo.

uvicorn app.main:app --reload --port 8000
