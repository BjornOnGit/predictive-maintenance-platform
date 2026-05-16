from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import Base, engine
from app.api.routes import auth, assets, sensors, predictions, alerts, maintenance, analytics, reporting
from app.core.scheduler import start_scheduler, stop_scheduler
from app import models  # Register models with Base
from app.core.logging import logger

app = FastAPI(title="Predictive Maintenance Platform")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
        
        # Start background scheduler
        start_scheduler()
    except Exception as e:
        logger.error(f"Failed to initialize app: {e}")


@app.on_event("shutdown")
def shutdown():
    try:
        stop_scheduler()
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")


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
