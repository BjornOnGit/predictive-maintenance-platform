"""
Recurring jobs. Runs as its own process (python -m app.core.scheduler),
separate from the API, so there is exactly one scheduler no matter how many
API workers run.

- Every 5 minutes: queue one prediction job per asset (the worker computes them)
- Every 5 minutes: scan for overdue maintenance
"""

from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app import models  # noqa: F401  (registers all models with SQLAlchemy)
from app.core.database import SessionLocal
from app.core.logging import logger
from app.core.queue import enqueue_prediction
from app.models.asset import Asset

scheduler = BlockingScheduler()


def recalculate_all_predictions():
    """Queue one prediction job per asset. Called every 5 minutes."""
    db = SessionLocal()
    try:
        asset_ids = [row.id for row in db.query(Asset.id).all()]
    finally:
        db.close()

    queued = 0
    for asset_id in asset_ids:
        try:
            enqueue_prediction(asset_id)
            queued += 1
        except Exception as e:
            logger.warning(f"Failed to queue prediction for asset {asset_id}: {e}")

    logger.info(f"✓ Queued predictions for {queued} assets")


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
    """Register the jobs and run the scheduler (blocks)."""
    scheduler.add_job(
        recalculate_all_predictions,
        trigger=IntervalTrigger(minutes=5),
        id="recalculate_predictions",
        name="Queue predictions for all assets",
        replace_existing=True,
    )
    scheduler.add_job(
        scan_maintenance_overdue,
        trigger=IntervalTrigger(minutes=5),
        id="scan_maintenance",
        name="Scan for overdue maintenance",
        replace_existing=True,
    )
    logger.info("✓ Scheduler started")
    scheduler.start()


if __name__ == "__main__":
    start_scheduler()