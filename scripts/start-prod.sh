#!/bin/bash
# D^t Solution Roadmap - 生產環境 (Linux/macOS)

set -e

echo "============================================"
echo "  D^t Solution Roadmap - 生產環境"
echo "============================================"
echo ""

cd "$(dirname "$0")/../backend"

if [ ! -d ".venv" ]; then
    echo "[錯誤] 找不到虛擬環境，請先執行 setup.sh"
    exit 1
fi

source .venv/bin/activate

echo "啟動生產環境伺服器 (多 Worker 模式)..."
echo ""
echo "  URL:      http://localhost:8000"
echo "  API Docs: http://localhost:8000/docs"
echo "  Workers:  自動偵測 CPU 核心數"
echo ""
echo "按 Ctrl+C 停止伺服器"
echo "============================================"
echo ""

exec gunicorn app.main:app -c gunicorn.conf.py
