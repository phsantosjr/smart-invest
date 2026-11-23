export type PortfolioScopeId = "consolidated" | string;

export type HouseholdMemberScope = {
  id: string;
  name: string;
  roleLabel: string;
  initials: string;
  netWorth: string;
  accent: "primary" | "secondary";
};

export type KpiMetric = {
  id: string;
  label: string;
  icon: string;
  value: string;
  delta?: string;
  deltaHint?: string;
  footer?: { left: string; right?: string };
  accentValue?: boolean;
};

export type UpcomingDividend = {
  dateLabel: string;
  ticker: string;
  tickerAccent: "primary" | "secondary" | "tertiary";
  description: string;
  amount: string;
};

export type AllocationSlice = {
  id: string;
  label: string;
  percent: number;
  amount: string;
  value: number;
  colorClass: string;
  colorVar: string;
};

export type RebalanceRow = {
  className: string;
  currentPercent: string;
  targetPercent: string;
  driftPercent: string;
  driftTone: "tertiary" | "secondary";
};

export type HoldingRow = {
  id: string;
  assetId: string;
  assetType: string;
  ticker: string;
  name: string;
  assetClass: string;
  assetClassBadge: string;
  holderInitial: string;
  holderName: string;
  holderAccent: "primary" | "secondary";
  custodian: string;
  quantity: string;
  averagePrice: string;
  currentPrice: string;
  lastQuotedAt: string | null;
  hasMarketQuote: boolean;
  netPosition: string;
  totalReturn: string;
  returnTone: "gain" | "loss";
};

export type PortfolioDashboardData = {
  uiScope?: PortfolioScopeId;
  scopeMembers: HouseholdMemberScope[];
  consolidatedNetWorth: string;
  kpis: KpiMetric[];
  dividends: UpcomingDividend[];
  allocation: AllocationSlice[];
  allocationMeta: {
    volatility12m: string;
    sharpe: string;
    benchmarkCdi12m: string;
  };
  rebalance: RebalanceRow[];
  suggestedContribution: string;
  holdings: HoldingRow[];
  holdingsTotal: number;
  holdingsClassCounts: Record<string, number>;
};