import type { BrokerageAccount } from "../../../types/accounts";
import type { Asset } from "../../../types/assets";
import type { FixedIncomeValuation } from "../../../types/fixedIncomeValuation";
import type { PortfolioPosition } from "../../../types/portfolioApi";
import type { UserProfile } from "../../../types/user";
import { areFinancialValuesHidden, formatBrl } from "../../../utils/money";
import { HIDDEN_PERCENT_LABEL } from "../../../utils/financialPrivacy";
import { shortDisplayName, userInitials } from "../../../utils/userDisplay";
import {
  detectInstrumentBadge,
  estimateNetBalance,
  formatMaturityLine,
  formatValuationRecency,
  indexerFilterTags,
  indexerRateLabel,
  instrumentBadgeClass,
  isTaxExempt,
  taxExemptionLabel,
  type IndexerFilter,
} from "./fixedIncomeDisplay";

const FIXED_INCOME_TYPES = new Set(["FIXED_INCOME", "TREASURY"]);

export type FixedIncomeRow = {
  id: string;
  assetId: string;
  brokerageAccountId: string;
  userId: string;
  instrumentBadge: string;
  instrumentBadgeClass: string;
  title: string;
  issuerLine: string;
  indexerPrimary: string;
  indexerSecondary: string;
  taxExempt: boolean;
  taxLabel: string;
  holderInitial: string;
  holderName: string;
  holderAccent: "primary" | "secondary";
  custodian: string;
  maturityDate: string | null;
  maturityLine: string | null;
  investedAmount: number;
  grossBalance: number;
  netBalance: number;
  gainAmount: number;
  gainPercent: number;
  hasValuation: boolean;
  valuationRecency: string;
  valuationDate: string | null;
  indexerTags: IndexerFilter[];
  searchBlob: string;
};

export type FixedIncomeSummary = {
  totalGross: number;
  totalInvested: number;
  totalNet: number;
  totalGain: number;
  gainPercentOnInvested: number;
  activeCount: number;
  upcomingMaturityValue: number;
  upcomingMaturityCount: number;
};

function latestValuationMap(
  valuations: FixedIncomeValuation[],
): Map<string, FixedIncomeValuation> {
  const map = new Map<string, FixedIncomeValuation>();
  for (const row of valuations) {
    const key = `${row.brokerage_account_id}-${row.asset_id}`;
    if (!map.has(key)) {
      map.set(key, row);
    }
  }
  return map;
}

function positionGross(position: PortfolioPosition): number {
  if (position.current_value != null) {
    return Number(position.current_value);
  }
  return Number(position.invested_amount);
}

export function mapFixedIncomeRows(input: {
  positions: PortfolioPosition[];
  assets: Asset[];
  accounts: BrokerageAccount[];
  valuations: FixedIncomeValuation[];
  currentUser: UserProfile | null;
}): FixedIncomeRow[] {
  const assetById = new Map(input.assets.map((asset) => [asset.id, asset]));
  const accountById = new Map(input.accounts.map((account) => [account.id, account]));
  const valuationByKey = latestValuationMap(input.valuations);

  const rows: FixedIncomeRow[] = [];

  for (const position of input.positions) {
    if (!FIXED_INCOME_TYPES.has(position.asset_type)) {
      continue;
    }

    const asset = assetById.get(position.asset_id);
    const account = accountById.get(position.brokerage_account_id);
    const valuation = valuationByKey.get(
      `${position.brokerage_account_id}-${position.asset_id}`,
    );

    const mergedAsset: Asset =
      asset ??
      ({
        id: position.asset_id,
        ticker: position.ticker,
        name: position.name,
        asset_type: position.asset_type as Asset["asset_type"],
        issuer: null,
        maturity_date: null,
        indexer: null,
        created_at: "",
      } satisfies Asset);

    const instrumentBadge = detectInstrumentBadge(mergedAsset.name, mergedAsset.asset_type);
    const taxExempt = isTaxExempt(mergedAsset, instrumentBadge);
    const invested = Number(position.invested_amount);
    const gross = positionGross(position);
    const net = estimateNetBalance(gross, invested, taxExempt);
    const gain = gross - invested;
    const gainPercent = invested > 0 ? (gain / invested) * 100 : 0;

    const isSelf = input.currentUser?.id === position.user_id;
    const holderName = isSelf
      ? shortDisplayName(input.currentUser?.name ?? "Titular")
      : "Outro titular";
    const holderInitial = isSelf
      ? userInitials(input.currentUser?.name ?? "?")
      : "?";

    const { primary, secondary } = indexerRateLabel(mergedAsset);
    const tags = indexerFilterTags(mergedAsset, instrumentBadge, taxExempt);
    const issuerLine = mergedAsset.issuer ?? "—";

    const searchBlob = [mergedAsset.name, issuerLine, account?.institution.name, mergedAsset.indexer]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    rows.push({
      id: `${position.brokerage_account_id}-${position.asset_id}`,
      assetId: position.asset_id,
      brokerageAccountId: position.brokerage_account_id,
      userId: position.user_id,
      instrumentBadge,
      instrumentBadgeClass: instrumentBadgeClass(instrumentBadge),
      title: mergedAsset.name,
      issuerLine,
      indexerPrimary: primary,
      indexerSecondary: secondary,
      taxExempt,
      taxLabel: taxExemptionLabel(taxExempt),
      holderInitial,
      holderName,
      holderAccent: isSelf ? "primary" : "secondary",
      custodian: account?.institution.name ?? "—",
      maturityDate: mergedAsset.maturity_date,
      maturityLine: formatMaturityLine(mergedAsset.maturity_date),
      investedAmount: invested,
      grossBalance: gross,
      netBalance: net,
      gainAmount: gain,
      gainPercent,
      hasValuation: position.has_market_quote,
      valuationRecency: formatValuationRecency(
        valuation?.valuation_date ?? null,
        valuation?.created_at ?? null,
      ),
      valuationDate: valuation?.valuation_date ?? null,
      indexerTags: tags,
      searchBlob,
    });
  }

  rows.sort((a, b) => b.grossBalance - a.grossBalance);
  return rows;
}

export function buildFixedIncomeSummary(rows: FixedIncomeRow[]): FixedIncomeSummary {
  const now = new Date();
  const horizon = new Date(now);
  horizon.setFullYear(horizon.getFullYear() + 2);

  let upcomingMaturityValue = 0;
  let upcomingMaturityCount = 0;

  for (const row of rows) {
    if (!row.maturityDate) {
      continue;
    }
    const maturity = new Date(`${row.maturityDate}T12:00:00`);
    if (Number.isNaN(maturity.getTime()) || maturity > horizon) {
      continue;
    }
    upcomingMaturityCount += 1;
    upcomingMaturityValue += row.grossBalance;
  }

  const totalGross = rows.reduce((sum, row) => sum + row.grossBalance, 0);
  const totalInvested = rows.reduce((sum, row) => sum + row.investedAmount, 0);
  const totalNet = rows.reduce((sum, row) => sum + row.netBalance, 0);
  const totalGain = totalGross - totalInvested;
  const gainPercentOnInvested = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

  return {
    totalGross,
    totalInvested,
    totalNet,
    totalGain,
    gainPercentOnInvested,
    activeCount: rows.length,
    upcomingMaturityValue,
    upcomingMaturityCount,
  };
}

export function formatSignedBrl(value: number): string {
  const prefix = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${prefix}${formatBrl(Math.abs(value))}`;
}

export function formatSignedPercent(value: number): string {
  if (areFinancialValuesHidden()) {
    return HIDDEN_PERCENT_LABEL;
  }
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(2).replace(".", ",")}%`;
}