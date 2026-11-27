export type AssetScope = "ALL" | "FII" | "STOCK" | "FIXED_INCOME" | "TREASURY";
export type ProjectionGroupBy = "month" | "year";

export type ProjectionRunRequest = {
  asset_scope: AssetScope;
  monthly_contribution: string;
  horizon_years: number;
  group_by: ProjectionGroupBy;
  allocate_contribution_by_last_dividend: boolean;
  scope?: "self" | "household";
};

export type ProjectionSummary = {
  initial_patrimony: string;
  final_patrimony: string;
  total_dividends: string;
  total_contributions: string;
  gain_percent: string;
};

export type ProjectionPeriodRow = {
  period_label: string;
  portfolio_value: string;
  dividends_in_period: string;
  contributions_in_period: string;
  cumulative_dividends: string;
  cumulative_contributions: string;
  gain_percent: string;
};

export type ProjectionChartBar = {
  period_label: string;
  portfolio_value: string;
};

export type ProjectionRunResponse = {
  asset_scope: AssetScope;
  group_by: ProjectionGroupBy;
  horizon_years: number;
  months_simulated: number;
  summary: ProjectionSummary;
  periods: ProjectionPeriodRow[];
  chart_bars: ProjectionChartBar[];
  notes: string[];
};