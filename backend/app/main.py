from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import SQLAlchemyError
from app.api.routes import auth, assets, sensors, predictions, alerts, maintenance, analytics, reporting
from app import models  # noqa: F401 — Register models with Base
from app.core.logging import logger
from app.core.config import settings

app = FastAPI(title="Predictive Maintenance Platform")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(auth.router)
app.include_router(assets.router)
app.include_router(sensors.router)
app.include_router(predictions.router)
app.include_router(alerts.router)
app.include_router(maintenance.router)
app.include_router(analytics.router)
app.include_router(reporting.router)


@app.get("/health")
def health():
    return {"status": "ok"}
