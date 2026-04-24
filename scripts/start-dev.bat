@echo off
chcp 65001 >nul
echo ============================================
echo   Dt Quality Roadmap - Development Server
echo ============================================
echo.

cd /d "%~dp0"

echo Starting Backend (http://localhost:8000)...
start "Backend" cmd /c start-backend.bat

timeout /t 3 /nobreak >nul

echo Starting Frontend (http://localhost:5173)...
start "Frontend" cmd /c start-frontend.bat

echo.
echo ============================================
echo   Servers started!
echo ============================================
echo.
echo   Backend:  http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo   Frontend: http://localhost:5173
echo.
pause
