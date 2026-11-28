import { describe, expect, it } from "vitest";

import {
  maskFormattedFinancialDisplay,
  HIDDEN_MONEY_LABEL,
  HIDDEN_PERCENT_LABEL,
  HIDDEN_QUANTITY_LABEL,
} from "../src/utils/financialPrivacy";
import { formatBrl, formatQuantity, registerValuesHiddenReader } from "../src/utils/money";

describe("financial privacy formatters", () => {
  it("masks BRL, quantity and pre-formatted strings when hidden", () => {
    registerValuesHiddenReader(() => true);

    expect(formatBrl(1234.56)).toBe(HIDDEN_MONEY_LABEL);
    expect(formatQuantity(100)).toBe(HIDDEN_QUANTITY_LABEL);
    expect(maskFormattedFinancialDisplay("R$ 1.234,56", true)).toBe(HIDDEN_MONEY_LABEL);
    expect(maskFormattedFinancialDisplay("+1,23%", true)).toBe(HIDDEN_PERCENT_LABEL);
    expect(maskFormattedFinancialDisplay("10 unidades", false)).toBe("10 unidades");
  });

  it("shows values when privacy mode is off", () => {
    registerValuesHiddenReader(() => false);

    expect(formatBrl(10)).toContain("R$");
    expect(maskFormattedFinancialDisplay("R$ 10,00", false)).toBe("R$ 10,00");
  });
});