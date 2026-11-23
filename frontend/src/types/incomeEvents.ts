export type IncomeType = "DIVIDEND" | "JCP" | "STOCK_YIELD" | "FII_YIELD" | "COUPON";

export type IncomeEventWrite = {
  brokerage_account_id: string;
  asset_id: string;
  income_type: IncomeType;
  gross_amount: string;
  tax_withheld: string;
  net_amount: string;
  ex_date?: string | null;
  payment_date: string;
};

export type IncomeEvent = IncomeEventWrite & {
  id: string;
  created_at: string;
};

export type IncomeEventListResponse = {
  items: IncomeEvent[];
  total_net_amount: string;
};

export const INCOME_TYPE_LABEL: Record<IncomeType, string> = {
  DIVIDEND: "Dividendos",
  JCP: "Juros sobre Capital Próprio",
  STOCK_YIELD: "Rendimento",
  FII_YIELD: "Rendimento",
  COUPON: "Cupom / Juros",
};

export const TAX_EXEMPT_INCOME_TYPES = new Set<IncomeType>([
  "DIVIDEND",
  "STOCK_YIELD",
  "FII_YIELD",
]);