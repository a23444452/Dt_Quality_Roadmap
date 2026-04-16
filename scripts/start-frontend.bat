@echo off
chcp 65001 >nul
echo ============================================
echo   D^t Quality Roadmap - Frontend
echo ============================================
echo.

cd /d "%~dp0..\frontend"

if not exist node_modules (
    echo [錯誤] 找不到 node_modules，請先執行 setup.bat
    pause
    exit /b 1
)

echo 啟動 Frontend 開發伺服器...
echo.
echo   URL: http://localhost:5173
echo.
echo 按 Ctrl+C 停止伺服器
echo ============================================
echo.

npm run dev
