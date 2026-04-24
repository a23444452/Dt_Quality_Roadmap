@echo off
echo ============================================
echo   Dt Quality Roadmap - Backend
echo ============================================
echo.

cd /d "%~dp0..\backend"

if not exist .venv (
    echo [Error] Virtual environment not found. Please run setup.bat first.
    pause
    exit /b 1
)

call .venv\Scripts\activate.bat

echo Starting Backend server...
echo.
echo   URL:      http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo.
echo Press Ctrl+C to stop
echo ============================================
echo.

uvicorn app.main:app --reload --port 8000
