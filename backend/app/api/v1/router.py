from fastapi import APIRouter

from app.api.v1.assets import router as assets_router
from app.api.v1.auth import router as auth_router
from app.api.v1.brokerage_accounts import router as brokerage_accounts_router
from app.api.v1.fixed_income_valuations import router as fixed_income_valuations_router
from app.api.v1.income_events import router as income_events_router
from app.api.v1.institutions import router as institutions_router
from app.api.v1.market_prices import router as market_prices_router
from app.api.v1.portfolio import router as portfolio_router
from app.api.v1.projections import router as projections_router
from app.api.v1.transactions import router as transactions_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(institutions_router)
api_router.include_router(brokerage_accounts_router)
api_router.include_router(assets_router)
api_router.include_router(transactions_router)
api_router.include_router(income_events_router)
api_router.include_router(fixed_income_valuations_router)
api_router.include_router(portfolio_router)
api_router.include_router(market_prices_router)
api_router.include_router(projections_router)