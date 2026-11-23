from collections.abc import Sequence
from decimal import Decimal, ROUND_HALF_UP

from app.models.transaction import Transaction

QTY_QUANT = Decimal("0.000001")
PRICE_QUANT = Decimal("0.0001")
AMOUNT_QUANT = Decimal("0.0001")

TRANSACTION_BUY = "BUY"
TRANSACTION_SELL = "SELL"


def quantize_quantity(value: Decimal) -> Decimal:
    return value.quantize(QTY_QUANT, rounding=ROUND_HALF_UP)


def quantize_price(value: Decimal) -> Decimal:
    return value.quantize(PRICE_QUANT, rounding=ROUND_HALF_UP)


def quantize_amount(value: Decimal) -> Decimal:
    return value.quantize(AMOUNT_QUANT, rounding=ROUND_HALF_UP)


def compute_trade_total_amount(
    transaction_type: str,
    quantity: Decimal,
    unit_price: Decimal,
    fees: Decimal,
) -> Decimal:
    gross = quantity * unit_price
    if transaction_type == TRANSACTION_BUY:
        return quantize_amount(gross + fees)
    if transaction_type == TRANSACTION_SELL:
        return quantize_amount(gross - fees)
    raise ValueError(f"Unsupported transaction_type: {transaction_type}")


def _sort_key(tx: Transaction) -> tuple:
    created = tx.created_at
    return (tx.transaction_date, created.isoformat() if created else "")


def compute_position_from_transactions(
    transactions: Sequence[Transaction],
) -> tuple[Decimal, Decimal, Decimal]:
    """Return net quantity, average unit price, and invested cost basis."""
    ordered = sorted(transactions, key=_sort_key)
    quantity = Decimal("0")
    cost_basis = Decimal("0")

    for tx in ordered:
        if tx.transaction_type == TRANSACTION_BUY:
            quantity += tx.quantity
            cost_basis += compute_trade_total_amount(
                TRANSACTION_BUY,
                tx.quantity,
                tx.unit_price,
                tx.fees,
            )
        elif tx.transaction_type == TRANSACTION_SELL:
            if tx.quantity > quantity:
                raise ValueError("sell exceeds custody")
            unit_avg = quantize_price(cost_basis / quantity) if quantity > 0 else Decimal("0")
            quantity -= tx.quantity
            cost_basis = quantize_amount(unit_avg * quantity) if quantity > 0 else Decimal("0")

    average_price = (
        quantize_price(cost_basis / quantity) if quantity > 0 else Decimal("0")
    )
    return quantize_quantity(quantity), average_price, quantize_amount(cost_basis)