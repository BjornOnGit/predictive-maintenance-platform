"""
APScheduler background job scheduler for recurring maintenance tasks.

Handles:
- Recalculate predictions every 5 minutes
- Scan for overdue maintenance
- Generate alerts for maintenance due
"""

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.services.prediction_service import save_prediction
from app.models.asset import Asset
from app.core.logging import logger

scheduler = BackgroundScheduler()


def recalculate_all_predictions():
    """
    Recalculate predictions for all assets.
    Called every 5 minutes.
    """
    try:
        db = SessionLocal()
        assets = db.query(Asset).all()
        
        count = 0
        for asset in assets:
            try:
                save_prediction(db, asset.id)
                count += 1
            except Exception as e:
                logger.warning(f"Failed to recalculate prediction for asset {asset.id}: {e}")
        
        logger.info(f"✓ Recalculated predictions for {count} assets")
        db.close()
    except Exception as e:
        logger.error(f"Error in recalculate_all_predictions: {e}")


def scan_maintenance_overdue():
    """
    Scan for overdue maintenance tasks.
    Called every 5 minutes.
    """
    try:
        db = SessionLocal()
        # This is a placeholder - would check maintenance logs vs last service dates
        logger.debug("Scanned for overdue maintenance")
        db.close()
    except Exception as e:
        logger.error(f"Error in scan_maintenance_overdue: {e}")


def start_scheduler():
    """Start the background scheduler."""
    if scheduler.running:
        logger.info("Scheduler already running")
        return
    
    try:
        # Schedule prediction recalculation every 5 minutes
        scheduler.add_job(
            recalculate_all_predictions,
            trigger=IntervalTrigger(minutes=5),
            id="recalculate_predictions",
            name="Recalculate predictions for all assets",
            replace_existing=True
        )
        
        # Schedule maintenance scan every 5 minutes
        scheduler.add_job(
            scan_maintenance_overdue,
            trigger=IntervalTrigger(minutes=5),
            id="scan_maintenance",
            name="Scan for overdue maintenance",
            replace_existing=True
        )
        
        scheduler.start()
        logger.info("✓ Background scheduler started")
    except Exception as e:
        logger.error(f"Failed to start scheduler: {e}")


def stop_scheduler():
    """Stop the background scheduler."""
    try:
        if scheduler.running:
            scheduler.shutdown()
            logger.info("✓ Scheduler stopped")
    except Exception as e:
        logger.error(f"Error stopping scheduler: {e}")
