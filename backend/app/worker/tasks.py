from uuid import UUID

from app import models  # noqa: F401  (registers all models with SQLAlchemy)
from app.core.database import SessionLocal
from app.core.logging import logger
from app.services.prediction_service import save_prediction


def update_prediction(asset_id: str) -> None:
    """Recalculate and store the prediction (and alerts) for one asset."""
    asset_uuid = UUID(asset_id)
    db = SessionLocal()
    try:
        save_prediction(db, asset_uuid)
    except ValueError as e:  # asset has no sensor readings yet
        logger.info(f"Skipped prediction for asset {asset_id}: {e}")
    finally:
        db.close()