@echo off
chcp 65001 >nul
echo ============================================
echo   D^t Quality Roadmap - 開發伺服器
echo ============================================
echo.

cd /d "%~dp0.."

echo 啟動 Backend (http://localhost:8000)...
start "Backend" cmd /k "cd backend && .venv\Scripts\activate.bat && uvicorn app.main:app --reload --port 8000"

timeout /t 3 /nobreak >nul

echo 啟動 Frontend (http://localhost:5173)...
start "Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ============================================
echo   伺服器已啟動！
echo ============================================
echo.
echo   Backend:  http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo   Frontend: http://localhost:5173
echo.
echo 按任意鍵關閉此視窗（伺服器會繼續運行）
pause >nul
