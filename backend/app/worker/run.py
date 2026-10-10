from redis import Redis
from rq import Queue, Worker

from app.core.config import settings

if __name__ == "__main__":
    connection = Redis.from_url(settings.REDIS_URL)
    Worker([Queue("predictions", connection=connection)], connection=connection).work()