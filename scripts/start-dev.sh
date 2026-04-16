#!/bin/bash
# D^t Quality Roadmap - 同時啟動 Backend + Frontend (macOS/Linux)

cd "$(dirname "$0")/.."

echo "============================================"
echo "  D^t Quality Roadmap - 開發伺服器"
echo "============================================"
echo ""

echo "啟動 Backend (http://localhost:8000)..."
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

sleep 3

echo "啟動 Frontend (http://localhost:5173)..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "============================================"
echo "  伺服器已啟動！"
echo "============================================"
echo ""
echo "  Backend:  http://localhost:8000"
echo "  API Docs: http://localhost:8000/docs"
echo "  Frontend: http://localhost:5173"
echo ""
echo "  Backend  PID: $BACKEND_PID"
echo "  Frontend PID: $FRONTEND_PID"
echo ""
echo "按 Ctrl+C 停止所有伺服器"
echo ""

# 攔截 Ctrl+C，同時停止前後端
trap "echo ''; echo '停止伺服器...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM

# 等待任一程序結束
wait
