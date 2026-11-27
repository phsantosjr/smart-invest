import { describe, expect, it } from "vitest";

import {
  computeChangeFromPrevious,
  filterPricesByRange,
  sortPricesByQuotedAtDesc,
} from "../src/features/market-prices/utils/priceHistory";
import type { MarketPriceRecord } from "../src/services/marketPricesApi";

function row(partial: Partial<MarketPriceRecord> & Pick<MarketPriceRecord, "price" | "quoted_at">): MarketPriceRecord {
  return {
    id: partial.id ?? "1",
    asset_id: partial.asset_id ?? "a1",
    source: partial.source ?? "BRAPI",
    recorded_by_user_id: null,
    created_at: partial.created_at ?? partial.quoted_at,
    ...partial,
  };
}

describe("priceHistory utils", () => {
  it("sorts by quoted_at desc", () => {
    const sorted = sortPricesByQuotedAtDesc([
      row({ id: "1", price: "10", quoted_at: "2026-01-01T12:00:00Z" }),
      row({ id: "2", price: "11", quoted_at: "2026-01-02T12:00:00Z" }),
    ]);
    expect(sorted[0].id).toBe("2");
  });

  it("computes percent change vs previous capture", () => {
    const change = computeChangeFromPrevious([
      row({ id: "2", price: "11", quoted_at: "2026-01-02T12:00:00Z" }),
      row({ id: "1", price: "10", quoted_at: "2026-01-01T12:00:00Z" }),
    ]);
    expect(change?.percent).toBeCloseTo(10);
    expect(change?.absolute).toBeCloseTo(1);
  });

  it("filters range from latest point", () => {
    const filtered = filterPricesByRange(
      [
        row({ price: "9", quoted_at: "2025-01-01T12:00:00Z" }),
        row({ price: "10", quoted_at: "2026-11-25T12:00:00Z" }),
        row({ price: "11", quoted_at: "2026-11-27T12:00:00Z" }),
      ],
      "5D",
    );
    expect(filtered).toHaveLength(2);
  });
});