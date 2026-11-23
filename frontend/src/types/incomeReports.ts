export type IncomeMonthlyRow = {
  month: string;
  total_net_amount: string;
};

export type IncomeMonthlyResponse = {
  total_net_amount: string;
  items: IncomeMonthlyRow[];
};

export type FiiReinvestmentItem = {
  asset_id: string;
  ticker: string | null;
  income_received: string;
  amount_purchased: string;
  missing_amount: string;
  status: "PENDING" | "COMPLETED";
};

export type ReinvestmentAnalysisResponse = {
  fii_reinvestment: {
    income_month: string;
    purchase_month: string;
    total_income_received: string;
    total_purchased: string;
    missing_amount: string;
    needs_reinvestment: boolean;
    items: FiiReinvestmentItem[];
  };
  stocks_smart_invest: {
    year: number;
    total_income_received: string;
    total_purchased: string;
    missing_amount: string;
    needs_reinvestment: boolean;
  };
};