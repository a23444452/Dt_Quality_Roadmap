@echo off
echo ============================================
echo   Dt Quality Roadmap - Frontend
echo ============================================
echo.

cd /d "%~dp0..\frontend"

if not exist node_modules (
    echo [Error] node_modules not found. Please run setup.bat first.
    pause
    exit /b 1
)

echo Starting Frontend dev server...
echo.
echo   URL: http://localhost:5173
echo.
echo Press Ctrl+C to stop
echo ============================================
echo.

npm run dev
