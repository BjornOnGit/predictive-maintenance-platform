from redis import Redis
from rq import Queue

from app.core.config import settings

# Redis.from_url is lazy: importing this never fails if Redis is down
predictions_queue = Queue("predictions", connection=Redis.from_url(settings.REDIS_URL))


def enqueue_prediction(asset_id) -> None:
    """Queue a prediction recalculation for one asset (runs in the worker)."""
    predictions_queue.enqueue(
        "app.worker.tasks.update_prediction",
        str(asset_id),
        job_timeout=60,
        result_ttl=0,
        failure_ttl=86400,
    )