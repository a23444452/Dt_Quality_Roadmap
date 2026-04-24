@echo off
echo ============================================
echo   Dt Quality Roadmap - Setup
echo ============================================
echo.

cd /d "%~dp0.."

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [Error] Python not found. Please install Python 3.11+
    echo Download: https://www.python.org/downloads/
    pause
    exit /b 1
)

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [Error] Node.js not found. Please install Node.js 20+
    echo Download: https://nodejs.org/
    pause
    exit /b 1
)

echo [1/6] Creating Python virtual environment...
cd backend
if not exist .venv (
    python -m venv .venv
)

echo [2/6] Activating venv and installing Backend dependencies...
call .venv\Scripts\activate.bat
pip install -r requirements.txt --quiet

echo [3/6] Creating environment file...
if not exist .env (
    copy .env.example .env
    echo [Note] Created backend\.env - please edit JWT_SECRET
)

echo [4/6] Running database migration...
alembic upgrade head

echo [5/6] Loading sample data...
python -m app.seed

cd ..

echo [6/6] Installing Frontend dependencies...
cd frontend
call npm install

cd ..

echo.
echo ============================================
echo   Setup complete!
echo ============================================
echo.
echo Run the following to start dev server:
echo   scripts\start-dev.bat
echo.
echo Or start separately:
echo   scripts\start-backend.bat
echo   scripts\start-frontend.bat
echo.
pause
