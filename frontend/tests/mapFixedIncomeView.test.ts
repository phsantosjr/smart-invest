import { describe, expect, it } from "vitest";

import { mapFixedIncomeRows } from "../src/features/fixed-income/utils/mapFixedIncomeView";

describe("mapFixedIncomeRows", () => {
  it("maps fixed income positions with tax and indexer metadata", () => {
    const rows = mapFixedIncomeRows({
      positions: [
        {
          brokerage_account_id: "acc-1",
          asset_id: "asset-1",
          user_id: "user-1",
          ticker: null,
          name: "CDB Banco Inter 110% CDI",
          asset_type: "FIXED_INCOME",
          quantity: "1",
          average_price: "50000",
          invested_amount: "50000",
          current_value: "56420",
          has_market_quote: true,
          current_price: null,
          last_quoted_at: null,
          quote_source: null,
        },
      ],
      assets: [
        {
          id: "asset-1",
          ticker: null,
          name: "CDB Banco Inter 110% CDI",
          asset_type: "FIXED_INCOME",
          issuer: "Banco Inter S.A.",
          maturity_date: "2026-08-15",
          indexer: "110% CDI",
          created_at: "2024-01-01T00:00:00Z",
        },
      ],
      accounts: [
        {
          id: "acc-1",
          user_id: "user-1",
          institution_id: "inst-1",
          account_number: "1",
          created_at: "2024-01-01T00:00:00Z",
          institution: {
            id: "inst-1",
            name: "Banco Inter",
            code: null,
            institution_type: "BANK",
          },
        },
      ],
      valuations: [
        {
          id: "val-1",
          brokerage_account_id: "acc-1",
          asset_id: "asset-1",
          applied_value: "50000",
          current_value: "56420",
          valuation_date: "2025-02-13",
          created_at: "2025-02-13T12:00:00Z",
        },
      ],
      currentUser: {
        id: "user-1",
        household_id: null,
        name: "Lucas Silva",
        email: "lucas@example.com",
        is_household_owner: true,
        is_2fa_enabled: false,
      },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].instrumentBadge).toBe("CDB");
    expect(rows[0].taxExempt).toBe(false);
    expect(rows[0].custodian).toBe("Banco Inter");
    expect(rows[0].indexerTags).toContain("cdi");
    expect(rows[0].netBalance).toBeLessThan(rows[0].grossBalance);
  });
});