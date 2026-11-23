import type { BrokerageAccount } from "../../../types/accounts";
import type { PortfolioPosition, PortfolioResponse } from "../../../types/portfolioApi";
import type {
  AllocationSlice,
  HoldingRow,
  KpiMetric,
  PortfolioDashboardData,
  PortfolioScopeId,
} from "../../../types/portfolio";
import type { UserProfile } from "../../../types/user";
import { formatBrl, formatQuantity, formatUnitPrice } from "../../../utils/money";
import { shortDisplayName, userInitials } from "../../../utils/userDisplay";

const ASSET_CLASS_LABEL: Record<string, string> = {
  STOCK: "Ações",
  FII: "FII",
  TREASURY: "Tesouro",
  FIXED_INCOME: "Renda Fixa Manual",
  FUND: "Fundos",
};

const ALLOCATION_CATEGORIES: Array<{
  id: string;
  label: string;
  colorClass: string;
  colorVar: string;
}> = [
  { id: "FII", label: "FII", colorClass: "bg-secondary", colorVar: "--si-secondary" },
  { id: "STOCK", label: "Ações", colorClass: "bg-primary", colorVar: "--si-primary" },
  { id: "FIXED_INCOME", label: "Renda Fixa", colorClass: "bg-outline", colorVar: "--si-outline" },
  { id: "TREASURY", label: "Tesouro", colorClass: "bg-tertiary", colorVar: "--si-tertiary" },
];

const EXTRA_ALLOCATION_CATEGORIES: Record<
  string,
  { label: string; colorClass: string; colorVar: string }
> = {
  FUND: {
    label: "Fundos",
    colorClass: "bg-on-surface-variant",
    colorVar: "--si-on-surface-variant",
  },
};

function formatQuotedAt(iso: string | null): string | null {
  if (!iso) {
    return null;
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

const ASSET_CLASS_BADGE: Record<string, string> = {
  STOCK: "bg-primary-container text-primary-fixed",
  FII: "bg-secondary-container text-on-secondary",
  TREASURY: "bg-tertiary-container text-on-tertiary",
  FIXED_INCOME: "bg-surface-bright text-on-surface",
  FUND: "bg-surface-container-high text-on-surface",
};

function sumInvested(positions: PortfolioPosition[]): number {
  return positions.reduce((total, row) => total + Number(row.invested_amount), 0);
}

function positionMarketValue(position: PortfolioPosition): number {
  if (position.current_value != null) {
    return Number(position.current_value);
  }
  return Number(position.invested_amount);
}

function sumMarketValue(positions: PortfolioPosition[]): number {
  return positions.reduce((total, row) => total + positionMarketValue(row), 0);
}

function buildClassCounts(holdings: HoldingRow[]): Record<string, number> {
  const counts: Record<string, number> = { all: holdings.length };
  for (const row of holdings) {
    counts[row.assetClass] = (counts[row.assetClass] ?? 0) + 1;
  }
  return counts;
}

function toAllocationSlice(
  category: { id: string; label: string; colorClass: string; colorVar: string },
  value: number,
  total: number,
): AllocationSlice {
  return {
    id: category.id,
    label: category.label,
    value,
    percent: total > 0 ? (value / total) * 100 : 0,
    amount: formatBrl(value),
    colorClass: category.colorClass,
    colorVar: category.colorVar,
  };
}

export function buildAllocation(positions: PortfolioPosition[]): AllocationSlice[] {
  const totals = new Map<string, number>();
  for (const row of positions) {
    const amount = positionMarketValue(row);
    if (!Number.isFinite(amount) || amount <= 0) {
      continue;
    }
    totals.set(row.asset_type, (totals.get(row.asset_type) ?? 0) + amount);
  }

  const knownIds = new Set(ALLOCATION_CATEGORIES.map((category) => category.id));
  const slices = ALLOCATION_CATEGORIES.map((category) =>
    toAllocationSlice(category, totals.get(category.id) ?? 0, 0),
  );

  for (const [assetType, value] of totals) {
    if (knownIds.has(assetType)) {
      continue;
    }
    const extra = EXTRA_ALLOCATION_CATEGORIES[assetType] ?? {
      label: assetType,
      colorClass: "bg-on-surface-variant",
      colorVar: "--si-on-surface-variant",
    };
    slices.push(toAllocationSlice({ id: assetType, ...extra }, value, 0));
  }

  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  return slices.map((slice) => toAllocationSlice(slice, slice.value, total));
}

function mapPositionToHolding(
  position: PortfolioPosition,
  account: BrokerageAccount | undefined,
  currentUser: UserProfile | null,
): HoldingRow {
  const assetClass = ASSET_CLASS_LABEL[position.asset_type] ?? position.asset_type;
  const isSelf = currentUser?.id === position.user_id;
  const holderName = isSelf
    ? shortDisplayName(currentUser?.name ?? "Titular")
    : "Outro titular";
  const holderInitial = isSelf ? userInitials(currentUser?.name ?? "?") : "?";
  const netValue =
    position.current_value != null
      ? Number(position.current_value)
      : Number(position.invested_amount);
  const invested = Number(position.invested_amount);
  const pnl = netValue - invested;
  const hasMarketQuote = position.has_market_quote;

  let totalReturn: string;
  let returnTone: HoldingRow["returnTone"];
  if (!hasMarketQuote) {
    totalReturn = "0,00%";
    returnTone = "gain";
  } else if (pnl === 0) {
    totalReturn = "—";
    returnTone = "gain";
  } else {
    totalReturn = `${pnl > 0 ? "+" : ""}${formatBrl(pnl)} (${invested > 0 ? ((pnl / invested) * 100).toFixed(2) : "0"}%)`;
    returnTone = pnl >= 0 ? "gain" : "loss";
  }

  return {
    id: `${position.brokerage_account_id}-${position.asset_id}`,
    assetId: position.asset_id,
    assetType: position.asset_type,
    ticker: position.ticker ?? "—",
    name: position.name,
    assetClass,
    assetClassBadge: ASSET_CLASS_BADGE[position.asset_type] ?? "bg-surface-container text-on-surface",
    holderInitial,
    holderName,
    holderAccent: isSelf ? "primary" : "secondary",
    custodian: account?.institution.name ?? "—",
    quantity: formatQuantity(position.quantity),
    averagePrice: formatUnitPrice(position.average_price),
    currentPrice:
      position.current_price != null ? formatUnitPrice(position.current_price) : "—",
    lastQuotedAt: formatQuotedAt(position.last_quoted_at),
    hasMarketQuote,
    netPosition: formatBrl(netValue),
    totalReturn,
    returnTone,
  };
}

function buildScopeMembers(
  investedTotal: number,
  marketTotal: number,
  currentUser: UserProfile | null,
): PortfolioDashboardData["scopeMembers"] {
  const netWorth = formatBrl(marketTotal);
  const selfName = currentUser ? shortDisplayName(currentUser.name) : "Minha carteira";
  const initials = currentUser ? userInitials(currentUser.name) : "—";

  return [
    {
      id: "consolidated",
      name: "Consolidado household",
      roleLabel: "",
      initials: "",
      netWorth,
      accent: "secondary",
    },
    {
      id: "self",
      name: selfName,
      roleLabel: "Titular",
      initials,
      netWorth: formatBrl(investedTotal),
      accent: "primary",
    },
  ];
}

function buildKpis(positions: PortfolioPosition[], holdingsCount: number): KpiMetric[] {
  const invested = sumInvested(positions);
  const market = sumMarketValue(positions);

  return [
    {
      id: "net-worth",
      label: "Patrimônio (referência)",
      icon: "account_balance_wallet",
      value: formatBrl(market),
      deltaHint: "cotação pendente usa custo",
    },
    {
      id: "cost-basis",
      label: "Custo Aplicado (PM)",
      icon: "inventory_2",
      value: formatBrl(invested),
    },
    {
      id: "composition",
      label: "Posições abertas",
      icon: "pie_chart",
      value: String(holdingsCount),
      deltaHint: "ativos com saldo",
    },
  ];
}

export function mapPortfolioToDashboard(
  response: PortfolioResponse,
  accounts: BrokerageAccount[],
  currentUser: UserProfile | null,
): PortfolioDashboardData {
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const holdings = response.positions.map((position) =>
    mapPositionToHolding(position, accountById.get(position.brokerage_account_id), currentUser),
  );

  const invested = sumInvested(response.positions);
  const market = sumMarketValue(response.positions);

  return {
    scopeMembers: buildScopeMembers(invested, market, currentUser),
    consolidatedNetWorth: formatBrl(market),
    kpis: buildKpis(response.positions, holdings.length),
    dividends: [],
    allocation: buildAllocation(response.positions),
    allocationMeta: {
      volatility12m: "—",
      sharpe: "—",
      benchmarkCdi12m: "—",
    },
    rebalance: [],
    suggestedContribution: "—",
    holdings,
    holdingsTotal: holdings.length,
    holdingsClassCounts: buildClassCounts(holdings),
  };
}

export function portfolioScopeToApi(scope: PortfolioScopeId): "self" | "household" {
  return scope === "consolidated" ? "household" : "self";
}