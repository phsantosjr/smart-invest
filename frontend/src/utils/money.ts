import {
  HIDDEN_MONEY_LABEL,
  HIDDEN_PERCENT_LABEL,
  HIDDEN_QUANTITY_LABEL,
} from "./financialPrivacy";

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const quantityFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 6,
});

type MoneyFormatOptions = {
  hidden?: boolean;
};

let readValuesHidden: () => boolean = () => false;

/** Registers Redux (or other) source for global privacy mode used by formatters. */
export function registerValuesHiddenReader(reader: () => boolean): void {
  readValuesHidden = reader;
}

function isValuesHidden(override?: boolean): boolean {
  if (override !== undefined) {
    return override;
  }
  return readValuesHidden();
}

export function areFinancialValuesHidden(): boolean {
  return isValuesHidden();
}

export function formatBrl(value: string | number, options?: MoneyFormatOptions): string {
  if (isValuesHidden(options?.hidden)) {
    return HIDDEN_MONEY_LABEL;
  }
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return "—";
  }
  return currencyFormatter.format(numeric);
}

export function formatQuantity(value: string | number, options?: MoneyFormatOptions): string {
  if (isValuesHidden(options?.hidden)) {
    return HIDDEN_QUANTITY_LABEL;
  }
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return "—";
  }
  return `${quantityFormatter.format(numeric)} un`;
}

export function formatUnitPrice(value: string | number, options?: MoneyFormatOptions): string {
  return formatBrl(value, options);
}

export function formatPercent(value: number, options?: MoneyFormatOptions): string {
  if (isValuesHidden(options?.hidden)) {
    return HIDDEN_PERCENT_LABEL;
  }
  if (!Number.isFinite(value)) {
    return "—";
  }
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}