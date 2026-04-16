@echo off
chcp 65001 >nul
echo ============================================
echo   D^t Quality Roadmap - 首次設定
echo ============================================
echo.

cd /d "%~dp0.."

REM 檢查 Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [錯誤] 找不到 Python，請先安裝 Python 3.11+
    echo 下載: https://www.python.org/downloads/
    pause
    exit /b 1
)

REM 檢查 Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo [錯誤] 找不到 Node.js，請先安裝 Node.js 20+
    echo 下載: https://nodejs.org/
    pause
    exit /b 1
)

echo [1/6] 建立 Python 虛擬環境...
cd backend
if not exist .venv (
    python -m venv .venv
)

echo [2/6] 啟動虛擬環境並安裝 Backend 依賴...
call .venv\Scripts\activate.bat
pip install -r requirements.txt --quiet

echo [3/6] 建立環境變數檔...
if not exist .env (
    copy .env.example .env
    echo [提示] 已建立 backend\.env，請編輯設定 JWT_SECRET
)

echo [4/6] 執行資料庫遷移...
alembic upgrade head

echo [5/6] 載入範例資料...
python -m app.seed

cd ..

echo [6/6] 安裝 Frontend 依賴...
cd frontend
call npm install

cd ..

echo.
echo ============================================
echo   設定完成！
echo ============================================
echo.
echo 執行以下指令啟動開發伺服器:
echo   scripts\start-dev.bat
echo.
echo 或分別啟動:
echo   scripts\start-backend.bat
echo   scripts\start-frontend.bat
echo.
pause
