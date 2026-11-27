import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.core.config import get_settings
from app.core.database import async_session_factory
from app.services.market_quote_sync_service import sync_scheduled_global

logger = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None


async def _run_scheduled_market_quote_sync() -> None:
    async with async_session_factory() as session:
        run = await sync_scheduled_global(session)
        logger.info(
            "scheduled_market_quote_sync_finished",
            extra={
                "run_id": str(run.id),
                "status": run.status,
                "updated_count": run.updated_count,
                "failed_count": len(run.failed_tickers or []),
            },
        )


def start_market_quote_scheduler() -> AsyncIOScheduler | None:
    global _scheduler  # noqa: PLW0603
    settings = get_settings()
    if not settings.market_quote_schedule_enabled:
        return None
    if _scheduler is not None:
        return _scheduler

    scheduler = AsyncIOScheduler(timezone=settings.market_quote_schedule_timezone)
    scheduler.add_job(
        _run_scheduled_market_quote_sync,
        trigger="cron",
        hour=settings.market_quote_schedule_hour,
        minute=settings.market_quote_schedule_minute,
        id="market_quote_daily_sync",
        replace_existing=True,
        misfire_grace_time=3600,
    )
    scheduler.start()
    _scheduler = scheduler
    return scheduler


def shutdown_market_quote_scheduler() -> None:
    global _scheduler  # noqa: PLW0603
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None