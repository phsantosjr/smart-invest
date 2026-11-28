export const HIDDEN_MONEY_LABEL = "R$ ••••••";
export const HIDDEN_QUANTITY_LABEL = "•••• un";
export const HIDDEN_PERCENT_LABEL = "•••• %";
export const HIDDEN_GENERIC_LABEL = "••••••";

const FORMATTED_MONEY_PATTERN = /R\$\s*[\d.,+\-−]/;
const FORMATTED_PERCENT_PATTERN = /[\d.,]+\s*%/;
const QUANTITY_UNIT_PATTERN = /\d[\d.,]*\s*un\b/;

/** Masks pre-formatted display strings (e.g. from Redux view models). */
export function maskFormattedFinancialDisplay(text: string, hidden: boolean): string {
  if (!hidden || !text.trim() || text === "—") {
    return text;
  }
  if (FORMATTED_MONEY_PATTERN.test(text)) {
    return HIDDEN_MONEY_LABEL;
  }
  if (QUANTITY_UNIT_PATTERN.test(text)) {
    return HIDDEN_QUANTITY_LABEL;
  }
  if (FORMATTED_PERCENT_PATTERN.test(text)) {
    return HIDDEN_PERCENT_LABEL;
  }
  if (/^[\d.,\s+\-−]+$/.test(text.trim())) {
    return HIDDEN_GENERIC_LABEL;
  }
  return text;
}