from decimal import Decimal
from uuid import uuid4

from app.services.fii_projection_engine import FiiSimulationInput, run_fii_projection


def test_single_fii_reinvests_dividend_and_contribution():
    asset_id = uuid4()
    fund = FiiSimulationInput(
        asset_id=asset_id,
        ticker="TEST11",
        quantity=Decimal("10"),
        unit_price=Decimal("10.0000"),
        unit_monthly_dividend=Decimal("1.0000"),
    )
    results = run_fii_projection(
        [fund],
        monthly_contribution=Decimal("500.0000"),
        horizon_months=2,
        allocate_contribution_by_last_dividend=True,
    )
    assert len(results) == 2
    assert results[0].dividends_received == Decimal("10.0000")
    assert results[0].portfolio_value > Decimal("100.0000")


def test_weighted_contribution_two_funds():
    a = uuid4()
    b = uuid4()
    funds = [
        FiiSimulationInput(
            asset_id=a,
            ticker="AAA11",
            quantity=Decimal("1"),
            unit_price=Decimal("10.0000"),
            unit_monthly_dividend=Decimal("60.0000"),
        ),
        FiiSimulationInput(
            asset_id=b,
            ticker="BBB11",
            quantity=Decimal("1"),
            unit_price=Decimal("20.0000"),
            unit_monthly_dividend=Decimal("40.0000"),
        ),
    ]
    results = run_fii_projection(
        funds,
        monthly_contribution=Decimal("100.0000"),
        horizon_months=1,
        allocate_contribution_by_last_dividend=True,
    )
    assert results[0].portfolio_value >= Decimal("240.0000")