export type IncomeAssetSummaryRow = {
  asset_id: string;
  ticker: string | null;
  name: string;
  asset_type: string;
  total_net_amount: string;
  event_count: number;
};

export type IncomeAssetSummaryResponse = {
  scope: string;
  rows: IncomeAssetSummaryRow[];
  grand_total_net: string;
};