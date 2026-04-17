# Gunicorn 生產環境配置
# D^t Solution Roadmap

import multiprocessing
import os

# Server socket
bind = os.getenv("GUNICORN_BIND", "0.0.0.0:8000")

# Worker 設定
# 建議公式: (2 x CPU核心數) + 1
workers = int(os.getenv("GUNICORN_WORKERS", multiprocessing.cpu_count() * 2 + 1))
worker_class = "uvicorn.workers.UvicornWorker"

# Worker 超時設定 (秒)
timeout = int(os.getenv("GUNICORN_TIMEOUT", 120))
graceful_timeout = 30
keepalive = 5

# 請求設定
max_requests = 1000  # Worker 處理此數量請求後重啟，防止記憶體洩漏
max_requests_jitter = 50  # 隨機抖動，避免所有 worker 同時重啟

# 日誌設定
accesslog = os.getenv("GUNICORN_ACCESS_LOG", "-")  # "-" 表示輸出到 stdout
errorlog = os.getenv("GUNICORN_ERROR_LOG", "-")
loglevel = os.getenv("GUNICORN_LOG_LEVEL", "info")

# 進程命名
proc_name = "dt-solution-roadmap"

# 預載應用程式 (減少 worker 啟動時間，但會增加記憶體使用)
preload_app = True

# 安全設定
limit_request_line = 4094
limit_request_fields = 100
limit_request_field_size = 8190
