import { describe, expect, it } from "vitest";

import { buildAllocation } from "../src/features/portfolio/utils/mapPortfolioView";
import type { PortfolioPosition } from "../src/types/portfolioApi";

function position(overrides: Partial<PortfolioPosition>): PortfolioPosition {
  return {
    brokerage_account_id: "acc-1",
    asset_id: "asset-1",
    user_id: "user-1",
    ticker: "PETR4",
    name: "Petrobras PN",
    asset_type: "STOCK",
    quantity: "10.000000",
    average_price: "10.0000",
    invested_amount: "100.0000",
    current_price: null,
    current_value: null,
    has_market_quote: false,
    last_quoted_at: null,
    quote_source: null,
    ...overrides,
  };
}

describe("buildAllocation", () => {
  it("always returns FII, stocks, fixed income and treasury slices", () => {
    const slices = buildAllocation([]);
    expect(slices.map((slice) => slice.id)).toEqual([
      "FII",
      "STOCK",
      "FIXED_INCOME",
      "TREASURY",
    ]);
    expect(slices.every((slice) => slice.value === 0)).toBe(true);
  });

  it("sums current value by asset type and computes percents", () => {
    const slices = buildAllocation([
      position({
        asset_id: "fii-1",
        asset_type: "FII",
        invested_amount: "350.0000",
        current_value: "400.0000",
      }),
      position({
        asset_id: "stk-1",
        asset_type: "STOCK",
        invested_amount: "250.0000",
        current_value: "300.0000",
      }),
      position({
        asset_id: "stk-2",
        asset_type: "STOCK",
        invested_amount: "80.0000",
        current_value: "100.0000",
      }),
      position({
        asset_id: "fi-1",
        asset_type: "FIXED_INCOME",
        invested_amount: "140.0000",
        current_value: "150.0000",
      }),
      position({
        asset_id: "tes-1",
        asset_type: "TREASURY",
        invested_amount: "45.0000",
        current_value: "50.0000",
      }),
    ]);

    const byId = Object.fromEntries(slices.map((slice) => [slice.id, slice]));
    expect(byId.FII.value).toBe(400);
    expect(byId.STOCK.value).toBe(400);
    expect(byId.FIXED_INCOME.value).toBe(150);
    expect(byId.TREASURY.value).toBe(50);
    expect(byId.FII.percent).toBe(40);
    expect(byId.STOCK.percent).toBe(40);
    expect(byId.FIXED_INCOME.percent).toBe(15);
    expect(byId.TREASURY.percent).toBe(5);
    expect(byId.STOCK.label).toBe("Ações");
    expect(byId.FIXED_INCOME.label).toBe("Renda Fixa");
    expect(byId.TREASURY.label).toBe("Tesouro");
  });

  it("falls back to invested amount when current value is missing", () => {
    const slices = buildAllocation([
      position({
        asset_type: "STOCK",
        invested_amount: "250.0000",
        current_value: null,
      }),
    ]);
    expect(slices.find((slice) => slice.id === "STOCK")?.value).toBe(250);
  });

  it("appends funds only when they have market value", () => {
    const withoutFunds = buildAllocation([
      position({
        asset_type: "STOCK",
        invested_amount: "100.0000",
        current_value: "100.0000",
      }),
    ]);
    expect(withoutFunds.some((slice) => slice.id === "FUND")).toBe(false);

    const withFunds = buildAllocation([
      position({
        asset_type: "STOCK",
        invested_amount: "100.0000",
        current_value: "100.0000",
      }),
      position({
        asset_id: "fund-1",
        asset_type: "FUND",
        invested_amount: "80.0000",
        current_value: "100.0000",
      }),
    ]);
    const funds = withFunds.find((slice) => slice.id === "FUND");
    expect(funds?.label).toBe("Fundos");
    expect(funds?.percent).toBe(50);
  });
});
