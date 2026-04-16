#!/bin/bash
# D^t Quality Roadmap - Backend (macOS/Linux)

cd "$(dirname "$0")/../backend"

if [ ! -d .venv ]; then
    echo "[錯誤] 找不到虛擬環境，請先執行 ./scripts/setup.sh"
    exit 1
fi

source .venv/bin/activate

echo "============================================"
echo "  D^t Quality Roadmap - Backend"
echo "============================================"
echo ""
echo "  URL:      http://localhost:8000"
echo "  API Docs: http://localhost:8000/docs"
echo ""
echo "按 Ctrl+C 停止伺服器"
echo "============================================"
echo ""

uvicorn app.main:app --reload --port 8000
