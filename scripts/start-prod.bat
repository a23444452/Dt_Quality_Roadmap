@echo off
echo ============================================
echo   Dt Solution Roadmap - Production
echo ============================================
echo.

cd /d "%~dp0..\backend"

if not exist .venv (
    echo [Error] Virtual environment not found. Please run setup.bat first.
    pause
    exit /b 1
)

call .venv\Scripts\activate.bat

echo Starting production server (multi-worker mode)...
echo.
echo   URL:      http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo   Workers:  Auto-detect CPU cores
echo.
echo Press Ctrl+C to stop
echo ============================================
echo.

gunicorn app.main:app -c gunicorn.conf.py
