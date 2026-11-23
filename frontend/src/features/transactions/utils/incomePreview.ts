import {
  INCOME_TYPE_LABEL,
  TAX_EXEMPT_INCOME_TYPES,
  type IncomeType,
} from "../../../types/incomeEvents";
import { formatBrl } from "../../../utils/money";

function parseMoney(value: string): number | null {
  const normalized = value.replace(",", ".").trim();
  if (!normalized) {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function suggestedIncomeType(assetType: string): IncomeType {
  if (assetType === "FII") {
    return "FII_YIELD";
  }
  if (assetType === "STOCK") {
    return "DIVIDEND";
  }
  return "COUPON";
}

export function computeIncomeNetPreview(
  incomeType: IncomeType,
  grossAmount: string,
  taxWithheld: string,
): { net: number | null; label: string } {
  const gross = parseMoney(grossAmount);
  if (gross === null) {
    return { net: null, label: "—" };
  }
  const tax = TAX_EXEMPT_INCOME_TYPES.has(incomeType) ? 0 : (parseMoney(taxWithheld) ?? 0);
  const net = gross - tax;
  return {
    net,
    label: `${formatBrl(net)} líquido · ${INCOME_TYPE_LABEL[incomeType]}`,
  };
}