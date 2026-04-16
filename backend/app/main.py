from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, users
from app.routers.dashboard import router as dashboard_router
from app.routers.statuses import router as statuses_router
from app.routers.defects import category_router, type_router
from app.routers.processes import process_router, station_router
from app.routers.plants import plant_router, tank_line_router
from app.routers.solutions import router as solutions_router
from app.routers.solution_map import router as solution_map_router
from app.routers.import_export import router as import_export_router

app = FastAPI(title="D^t Quality Roadmap", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
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
app.include_router(users.router)


@app.get("/api/v1/health")
def health_check():
    return {"status": "ok"}
