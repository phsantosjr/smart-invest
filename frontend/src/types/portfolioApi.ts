export type PortfolioScopeParam = "self" | "household";

export type PortfolioPosition = {
  brokerage_account_id: string;
  asset_id: string;
  user_id: string;
  ticker: string | null;
  name: string;
  asset_type: string;
  quantity: string;
  average_price: string;
  invested_amount: string;
  current_price: string | null;
  current_value: string | null;
  has_market_quote: boolean;
  last_quoted_at: string | null;
  quote_source: string | null;
};

export type PortfolioResponse = {
  scope: string;
  positions: PortfolioPosition[];
};