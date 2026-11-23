import { describe, expect, it } from "vitest";

import {
  formatAssetOptionLabel,
  formatAssetSearchText,
} from "../src/features/transactions/utils/assetDisplay";
import type { Asset } from "../src/types/assets";

const fixedIncome: Asset = {
  id: "1",
  ticker: null,
  name: "CDB Banco Inter 110% CDI",
  asset_type: "FIXED_INCOME",
  issuer: "Banco Inter",
  maturity_date: "2029-12-31",
  indexer: "CDI",
  created_at: "2026-01-01T00:00:00Z",
};

describe("assetDisplay", () => {
  it("indexes fixed income by issuer and indexer", () => {
    expect(formatAssetSearchText(fixedIncome)).toContain("BANCO INTER");
    expect(formatAssetSearchText(fixedIncome)).toContain("CDI");
  });

  it("labels fixed income without ticker", () => {
    expect(formatAssetOptionLabel(fixedIncome)).toMatch(/CDB Banco Inter/);
    expect(formatAssetOptionLabel(fixedIncome)).toMatch(/Banco Inter/);
    expect(formatAssetOptionLabel(fixedIncome)).toMatch(/CDI/);
  });
});