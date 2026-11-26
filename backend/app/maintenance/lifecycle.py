import asyncio
import logging
from contextlib import asynccontextmanager, suppress
from starlette.concurrency import run_in_threadpool
from app.core.config import SETTINGS

logger = logging.getLogger(__name__)


async def retention_loop():
    from app.maintenance.retention import purge
    while True:
        delay = 86400
        try:
            result = await run_in_threadpool(purge, apply=True)
            logger.info("retention_completed counts=%s", result)
        except Exception as error:
            logger.error("retention_failed error_type=%s", type(error).__name__)
            delay = 3600
        await asyncio.sleep(delay)


@asynccontextmanager
async def maintenance_lifespan(app):
    task = asyncio.create_task(retention_loop()) if SETTINGS.environment == "production" else None
    try:
        yield
    finally:
        if task:
            task.cancel()
            with suppress(asyncio.CancelledError):
                await task
