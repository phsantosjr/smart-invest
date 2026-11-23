from datetime import date
from decimal import Decimal

from app.models.transaction import Transaction
from app.services.position_math import compute_position_from_transactions


def _tx(
    *,
    transaction_type: str,
    quantity: str,
    unit_price: str,
    fees: str = "0",
    transaction_date: date = date(2026, 1, 1),
) -> Transaction:
    qty = Decimal(quantity)
    price = Decimal(unit_price)
    fee = Decimal(fees)
    total = (
        qty * price + fee
        if transaction_type == "BUY"
        else qty * price - fee
    )
    return Transaction(
        transaction_type=transaction_type,
        quantity=qty,
        unit_price=price,
        fees=fee,
        total_amount=total,
        transaction_date=transaction_date,
    )


def test_average_price_two_buys_hglg11_scenario():
    txs = [
        _tx(
            transaction_type="BUY",
            quantity="10",
            unit_price="160",
            fees="0",
            transaction_date=date(2026, 1, 5),
        ),
        _tx(
            transaction_type="BUY",
            quantity="10",
            unit_price="150",
            fees="2",
            transaction_date=date(2026, 2, 5),
        ),
    ]
    quantity, average_price, invested = compute_position_from_transactions(txs)
    assert quantity == Decimal("20.000000")
    assert average_price == Decimal("155.1000")
    assert invested == Decimal("3102.0000")


def test_sell_keeps_average_price():
    txs = [
        _tx(
            transaction_type="BUY",
            quantity="100",
            unit_price="35.50",
            fees="0",
        ),
        _tx(
            transaction_type="SELL",
            quantity="40",
            unit_price="40",
            fees="0",
            transaction_date=date(2026, 2, 1),
        ),
    ]
    quantity, average_price, invested = compute_position_from_transactions(txs)
    assert quantity == Decimal("60.000000")
    assert average_price == Decimal("35.5000")
    assert invested == Decimal("2130.0000")