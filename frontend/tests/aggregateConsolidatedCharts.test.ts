import { describe, expect, it } from "vitest";

import {
  aggregateDividendsByTicker,
  aggregateDividendsByYear,
  filterEventsByAssetIds,
} from "../src/features/dividends/utils/aggregateConsolidatedCharts";
import type { IncomeEvent } from "../src/types/incomeEvents";
import type { IncomeAssetSummaryRow } from "../src/types/incomeSummary";

const baseEvent = (overrides: Partial<IncomeEvent> & Pick<IncomeEvent, "asset_id" | "payment_date" | "net_amount">): IncomeEvent => ({
  id: "x",
  brokerage_account_id: "b1",
  income_type: "DIVIDEND",
  gross_amount: overrides.net_amount,
  tax_withheld: "0",
  ex_date: null,
  created_at: "2026-01-01T00:00:00Z",
  ...overrides,
});

describe("aggregateConsolidatedCharts", () => {
  it("filters events by asset id set", () => {
    const events = [
      baseEvent({ asset_id: "a1", payment_date: "2026-01-01", net_amount: "10" }),
      baseEvent({ asset_id: "a2", payment_date: "2026-01-02", net_amount: "20" }),
    ];
    const filtered = filterEventsByAssetIds(events, new Set(["a1"]));
    expect(filtered).toHaveLength(1);
    expect(filtered[0].asset_id).toBe("a1");
  });

  it("aggregates dividends by calendar year", () => {
    const events = [
      baseEvent({ asset_id: "a1", payment_date: "2024-06-01", net_amount: "100.0000" }),
      baseEvent({ asset_id: "a1", payment_date: "2024-12-01", net_amount: "50.0000" }),
      baseEvent({ asset_id: "a1", payment_date: "2025-01-15", net_amount: "25.0000" }),
    ];
    expect(aggregateDividendsByYear(events)).toEqual([
      { label: "2024", value: 150 },
      { label: "2025", value: 25 },
    ]);
  });

  it("aggregates and sorts dividends by ticker", () => {
    const rows: IncomeAssetSummaryRow[] = [
      {
        asset_id: "a1",
        ticker: "PETR4",
        name: "Petrobras",
        asset_type: "STOCK",
        total_net_amount: "75.0000",
        event_count: 1,
      },
      {
        asset_id: "a2",
        ticker: "VALE3",
        name: "Vale",
        asset_type: "STOCK",
        total_net_amount: "100.0000",
        event_count: 1,
      },
    ];
    expect(aggregateDividendsByTicker(rows)).toEqual([
      { label: "VALE3", value: 100 },
      { label: "PETR4", value: 75 },
    ]);
  });
});