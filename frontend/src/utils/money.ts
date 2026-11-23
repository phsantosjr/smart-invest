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

export function formatBrl(value: string | number): string {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return "—";
  }
  return currencyFormatter.format(numeric);
}

export function formatQuantity(value: string | number): string {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return "—";
  }
  return `${quantityFormatter.format(numeric)} un`;
}

export function formatUnitPrice(value: string | number): string {
  return formatBrl(value);
}