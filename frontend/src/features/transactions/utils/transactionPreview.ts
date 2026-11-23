import type { PortfolioPosition } from "../../../types/portfolioApi";
import type { TransactionType } from "../../../types/transactions";
import { formatBrl } from "../../../utils/money";

export function computeTransactionTotal(
  transactionType: TransactionType,
  quantity: string,
  unitPrice: string,
  fees: string,
): string | null {
  const qty = Number(quantity);
  const price = Number(unitPrice);
  const fee = Number(fees || "0");
  if (!Number.isFinite(qty) || !Number.isFinite(price) || !Number.isFinite(fee)) {
    return null;
  }
  if (qty <= 0 || price < 0 || fee < 0) {
    return null;
  }
  const gross = qty * price;
  const total = transactionType === "BUY" ? gross + fee : gross - fee;
  return formatBrl(total);
}

export function computeTransactionTotalBreakdown(
  transactionType: TransactionType,
  quantity: string,
  unitPrice: string,
  fees: string,
): string | null {
  const qty = Number(quantity);
  const price = Number(unitPrice);
  const fee = Number(fees || "0");
  if (!Number.isFinite(qty) || !Number.isFinite(price) || qty <= 0 || price < 0) {
    return null;
  }
  const feeLabel = formatBrl(fee);
  const sign = transactionType === "BUY" ? "+" : "−";
  return `(${formatQuantityShort(qty)} × ${formatBrl(price)}) ${sign} ${feeLabel} taxas`;
}

function formatQuantityShort(qty: number): string {
  const rounded = Number.isInteger(qty) ? String(qty) : qty.toFixed(4).replace(/\.?0+$/, "");
  return `${rounded} un`;
}

export type AveragePriceProjection = {
  tickerLabel: string;
  currentAverage: string;
  currentQuantity: string;
  nextAverage: string;
  nextQuantity: string;
};

export function projectAveragePriceAfterBuy(
  position: PortfolioPosition | undefined,
  quantity: string,
  unitPrice: string,
  fees: string,
  tickerLabel: string,
): AveragePriceProjection | null {
  const buyQty = Number(quantity);
  const price = Number(unitPrice);
  const fee = Number(fees || "0");
  if (!Number.isFinite(buyQty) || !Number.isFinite(price) || buyQty <= 0 || price < 0) {
    return null;
  }

  const currentQty = position ? Number(position.quantity) : 0;
  const currentInvested = position ? Number(position.invested_amount) : 0;
  const currentAvg = position ? Number(position.average_price) : 0;

  const addInvested = buyQty * price + (Number.isFinite(fee) && fee > 0 ? fee : 0);
  const nextQty = currentQty + buyQty;
  if (nextQty <= 0) {
    return null;
  }
  const nextAvg = (currentInvested + addInvested) / nextQty;

  return {
    tickerLabel,
    currentAverage: formatBrl(currentQty > 0 && currentAvg > 0 ? currentAvg : 0),
    currentQuantity: formatQtyLabel(currentQty),
    nextAverage: formatBrl(nextAvg),
    nextQuantity: formatQtyLabel(nextQty),
  };
}

function formatQtyLabel(qty: number): string {
  const value = Number.isInteger(qty) ? String(qty) : qty.toFixed(2).replace(/\.?0+$/, "");
  return `${value} un`;
}