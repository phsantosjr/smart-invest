import type { IncomeEvent } from "../../../types/incomeEvents";
import type { IncomeAssetSummaryRow } from "../../../types/incomeSummary";
import type { DividendsChartBar } from "../components/DividendsBarChart";

export function filterEventsByAssetIds(
  events: IncomeEvent[],
  assetIds: Set<string>,
): IncomeEvent[] {
  return events.filter((event) => assetIds.has(event.asset_id));
}

export function aggregateDividendsByYear(events: IncomeEvent[]): DividendsChartBar[] {
  const totals = new Map<string, number>();
  for (const event of events) {
    const year = event.payment_date.slice(0, 4);
    totals.set(year, (totals.get(year) ?? 0) + Number.parseFloat(event.net_amount));
  }
  return [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, value]) => ({ label, value }));
}

export function aggregateDividendsByTicker(rows: IncomeAssetSummaryRow[]): DividendsChartBar[] {
  return rows
    .map((row) => ({
      label: row.ticker ?? row.name,
      value: Number.parseFloat(row.total_net_amount),
    }))
    .sort((a, b) => b.value - a.value);
}