export type FixedIncomeValuationWrite = {
  brokerage_account_id: string;
  asset_id: string;
  applied_value?: string;
  current_value: string;
  valuation_date: string;
};

export type FixedIncomeValuation = FixedIncomeValuationWrite & {
  id: string;
  created_at: string;
};