#!/bin/bash
# D^t Quality Roadmap - Frontend (macOS/Linux)

cd "$(dirname "$0")/../frontend"

if [ ! -d node_modules ]; then
    echo "[錯誤] 找不到 node_modules，請先執行 ./scripts/setup.sh"
    exit 1
fi

echo "============================================"
echo "  D^t Quality Roadmap - Frontend"
echo "============================================"
echo ""
echo "  URL: http://localhost:5173"
echo ""
echo "按 Ctrl+C 停止伺服器"
echo "============================================"
echo ""

npm run dev
