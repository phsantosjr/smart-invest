import logging
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.integrations.quotes.base import QuoteProviderError, QuoteResult
from app.integrations.quotes.factory import QuoteProviderFactory
from app.models.asset import Asset
from app.models.market_quote_sync_run import (
    STATUS_COMPLETED,
    STATUS_FAILED,
    STATUS_RUNNING,
    TRIGGER_MANUAL,
    TRIGGER_SCHEDULED,
    MarketQuoteSyncRun,
)
from app.models.user import User
from app.schemas.market_quote_sync import MarketQuoteSyncResponse
from app.services import market_price_service
from app.services.portfolio_quote_targets import (
    list_open_variable_assets_for_user,
    list_open_variable_assets_globally,
)

logger = logging.getLogger(__name__)


async def _resolve_quote_with_fallback(ticker: str) -> tuple[QuoteResult, set[str]]:
    settings = get_settings()
    providers_used: set[str] = set()
    primary = QuoteProviderFactory.get_provider()
    providers_used.add(primary.source_name)

    try:
        return await primary.get_quote(ticker), providers_used
    except (QuoteProviderError, ValueError) as primary_exc:
        if not settings.market_quote_fallback_enabled:
            raise primary_exc
        fallback = QuoteProviderFactory.get_fallback_provider()
        providers_used.add(fallback.source_name)
        return await fallback.get_quote(ticker), providers_used


async def _sync_assets(
    session: AsyncSession,
    assets: list[Asset],
    *,
    run: MarketQuoteSyncRun,
) -> tuple[int, list[str], set[str]]:
    updated_count = 0
    failed_tickers: list[str] = []
    all_providers: set[str] = set()

    for asset in assets:
        ticker = (asset.ticker or "").strip().upper()
        if not ticker:
            continue
        try:
            quote, providers_used = await _resolve_quote_with_fallback(ticker)
            all_providers.update(providers_used)
            await market_price_service.create_provider_market_price(
                session,
                asset_id=asset.id,
                quote=quote,
            )
            updated_count += 1
        except (QuoteProviderError, ValueError) as exc:
            failed_tickers.append(ticker)
            logger.warning(
                "market_quote_sync_failed",
                extra={"ticker": ticker, "error": str(exc), "run_id": str(run.id)},
            )

    await session.commit()
    return updated_count, failed_tickers, all_providers


async def _start_run(
    session: AsyncSession,
    *,
    trigger: str,
    user: User | None,
) -> MarketQuoteSyncRun:
    settings = get_settings()
    run = MarketQuoteSyncRun(
        triggered_by_user_id=user.id if user else None,
        trigger=trigger,
        status=STATUS_RUNNING,
        started_at=datetime.now(UTC),
        primary_provider=settings.market_quote_provider.upper(),
        updated_count=0,
        failed_tickers=[],
    )
    session.add(run)
    await session.commit()
    await session.refresh(run)
    return run


async def _finish_run(
    session: AsyncSession,
    run: MarketQuoteSyncRun,
    *,
    updated_count: int,
    failed_tickers: list[str],
    providers_used: set[str],
    message: str | None = None,
) -> MarketQuoteSyncRun:
    run.updated_count = updated_count
    run.failed_tickers = failed_tickers
    run.providers_used = ",".join(sorted(providers_used)) if providers_used else None
    run.finished_at = datetime.now(UTC)
    run.message = message
    run.status = STATUS_FAILED if message else STATUS_COMPLETED
    await session.commit()
    await session.refresh(run)
    return run


async def sync_for_user(
    session: AsyncSession,
    user: User,
    *,
    asset_ids: set[UUID] | None = None,
) -> MarketQuoteSyncResponse:
    settings = get_settings()
    if settings.market_quote_provider.lower() == "brapi" and not settings.brapi_token:
        raise QuoteProviderError("BRAPI_TOKEN é obrigatório para sincronização.")

    assets = await list_open_variable_assets_for_user(session, user.id)
    if asset_ids:
        assets = [asset for asset in assets if asset.id in asset_ids]

    run = await _start_run(session, trigger=TRIGGER_MANUAL, user=user)
    try:
        updated_count, failed_tickers, providers_used = await _sync_assets(
            session,
            assets,
            run=run,
        )
        await _finish_run(
            session,
            run,
            updated_count=updated_count,
            failed_tickers=failed_tickers,
            providers_used=providers_used,
        )
    except Exception as exc:  # noqa: BLE001
        await _finish_run(
            session,
            run,
            updated_count=0,
            failed_tickers=[],
            providers_used=set(),
            message=str(exc),
        )
        raise

    return MarketQuoteSyncResponse(
        provider=run.primary_provider,
        updated_count=run.updated_count,
        failed_tickers=list(run.failed_tickers or []),
        sync_run_id=run.id,
        providers_used=run.providers_used,
    )


async def sync_scheduled_global(session: AsyncSession) -> MarketQuoteSyncRun:
    settings = get_settings()
    if settings.market_quote_provider.lower() == "brapi" and not settings.brapi_token:
        logger.error("scheduled_market_quote_sync_skipped: BRAPI_TOKEN ausente")
        run = await _start_run(session, trigger=TRIGGER_SCHEDULED, user=None)
        await _finish_run(
            session,
            run,
            updated_count=0,
            failed_tickers=[],
            providers_used=set(),
            message="BRAPI_TOKEN ausente",
        )
        return run

    assets = await list_open_variable_assets_globally(session)
    run = await _start_run(session, trigger=TRIGGER_SCHEDULED, user=None)
    try:
        updated_count, failed_tickers, providers_used = await _sync_assets(
            session,
            assets,
            run=run,
        )
        return await _finish_run(
            session,
            run,
            updated_count=updated_count,
            failed_tickers=failed_tickers,
            providers_used=providers_used,
        )
    except Exception as exc:  # noqa: BLE001
        return await _finish_run(
            session,
            run,
            updated_count=0,
            failed_tickers=[],
            providers_used=set(),
            message=str(exc),
        )


async def list_sync_runs(
    session: AsyncSession,
    viewer: User,
    *,
    limit: int = 50,
) -> list[MarketQuoteSyncRun]:
    stmt = select(MarketQuoteSyncRun).order_by(desc(MarketQuoteSyncRun.started_at)).limit(limit)
    if not viewer.is_superuser:
        stmt = stmt.where(MarketQuoteSyncRun.triggered_by_user_id == viewer.id)
    result = await session.execute(stmt)
    return list(result.scalars().all())