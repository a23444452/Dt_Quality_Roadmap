import asyncio
import time
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.middleware.rate_limit import limiter
from app.routers import auth, reference, users
from app.routers.dashboard import router as dashboard_router
from app.routers.statuses import router as statuses_router
from app.routers.defects import category_router, type_router
from app.routers.processes import process_router, station_router
from app.routers.plants import plant_router, tank_line_router
from app.routers.solutions import router as solutions_router
from app.routers.solution_map import router as solution_map_router
from app.routers.import_export import router as import_export_router
from app.routers.g_items import router as g_items_router

IMPORT_TEMP_DIR = Path("tmp/imports")
IMPORT_TTL_SECONDS = 15 * 60

app = FastAPI(title="D^t Quality Roadmap", version="0.1.0")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(reference.router)
app.include_router(dashboard_router)
app.include_router(statuses_router)
app.include_router(category_router)
app.include_router(type_router)
app.include_router(process_router)
app.include_router(station_router)
app.include_router(plant_router)
app.include_router(tank_line_router)
app.include_router(solutions_router)
app.include_router(solution_map_router)
app.include_router(import_export_router)
app.include_router(g_items_router)
app.include_router(users.router)


async def cleanup_expired_imports():
    while True:
        if IMPORT_TEMP_DIR.exists():
            now = time.time()
            for f in IMPORT_TEMP_DIR.iterdir():
                if now - f.stat().st_mtime > IMPORT_TTL_SECONDS:
                    f.unlink(missing_ok=True)
        await asyncio.sleep(300)


@app.on_event("startup")
async def start_cleanup_scheduler():
    IMPORT_TEMP_DIR.mkdir(parents=True, exist_ok=True)
    asyncio.create_task(cleanup_expired_imports())


@app.get("/api/v1/health")
def health_check():
    return {"status": "ok"}
