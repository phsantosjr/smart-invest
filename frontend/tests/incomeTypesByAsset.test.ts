import { describe, expect, it } from "vitest";

import { allowedIncomeTypes } from "../src/features/transactions/utils/incomeTypesByAsset";

describe("allowedIncomeTypes", () => {
  it("offers three income kinds for stocks", () => {
    expect(allowedIncomeTypes("STOCK")).toEqual(["DIVIDEND", "JCP", "STOCK_YIELD"]);
  });

  it("offers only FII yield for FIIs", () => {
    expect(allowedIncomeTypes("FII")).toEqual(["FII_YIELD"]);
  });
});