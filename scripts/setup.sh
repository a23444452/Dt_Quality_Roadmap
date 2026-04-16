#!/bin/bash
# D^t Quality Roadmap - 首次設定 (macOS/Linux)

set -e

echo "============================================"
echo "  D^t Quality Roadmap - 首次設定"
echo "============================================"
echo ""

cd "$(dirname "$0")/.."

# 檢查 Python
if command -v python3 &>/dev/null; then
    echo "[OK] $(python3 --version)"
else
    echo "[錯誤] 找不到 Python，請先安裝 Python 3.11+"
    echo "下載: https://www.python.org/downloads/"
    exit 1
fi

# 檢查 Node.js
if command -v node &>/dev/null; then
    echo "[OK] Node.js $(node --version)"
else
    echo "[錯誤] 找不到 Node.js，請先安裝 Node.js 20+"
    echo "下載: https://nodejs.org/"
    exit 1
fi

echo ""
echo "[1/6] 建立 Python 虛擬環境..."
cd backend
if [ ! -d .venv ]; then
    python3 -m venv .venv
fi

echo "[2/6] 啟動虛擬環境並安裝 Backend 依賴..."
source .venv/bin/activate
pip install -r requirements.txt --quiet

echo "[3/6] 建立環境變數檔..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "[提示] 已建立 backend/.env，請編輯設定 JWT_SECRET"
fi

echo "[4/6] 執行資料庫遷移..."
alembic upgrade head

echo "[5/6] 載入範例資料..."
python -m app.seed

cd ..

echo "[6/6] 安裝 Frontend 依賴..."
cd frontend
npm install

cd ..

echo ""
echo "============================================"
echo "  設定完成！"
echo "============================================"
echo ""
echo "執行以下指令啟動開發伺服器:"
echo "  ./scripts/start-dev.sh"
echo ""
echo "或分別啟動:"
echo "  ./scripts/start-backend.sh"
echo "  ./scripts/start-frontend.sh"
echo ""
