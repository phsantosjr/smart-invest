import type { MarketPriceRecord } from "../../../services/marketPricesApi";

export type PriceHistoryRange = "5D" | "1M" | "6M" | "YTD" | "1Y" | "ALL";

export const PRICE_HISTORY_RANGES: { id: PriceHistoryRange; label: string }[] = [
  { id: "5D", label: "5D" },
  { id: "1M", label: "1M" },
  { id: "6M", label: "6M" },
  { id: "YTD", label: "YTD" },
  { id: "1Y", label: "1Y" },
  { id: "ALL", label: "Max" },
];

export function sortPricesByQuotedAtDesc(records: MarketPriceRecord[]): MarketPriceRecord[] {
  return [...records].sort(
    (a, b) => new Date(b.quoted_at).getTime() - new Date(a.quoted_at).getTime(),
  );
}

export function sortPricesByQuotedAtAsc(records: MarketPriceRecord[]): MarketPriceRecord[] {
  return [...records].sort(
    (a, b) => new Date(a.quoted_at).getTime() - new Date(b.quoted_at).getTime(),
  );
}

export function latestMarketPrice(records: MarketPriceRecord[]): MarketPriceRecord | null {
  const sorted = sortPricesByQuotedAtDesc(records);
  return sorted[0] ?? null;
}

export type PriceChangeSummary = {
  absolute: number;
  percent: number;
  referenceLabel: string;
};

export function computeChangeFromPrevious(
  records: MarketPriceRecord[],
): PriceChangeSummary | null {
  const sorted = sortPricesByQuotedAtDesc(records);
  if (sorted.length < 2) {
    return null;
  }
  const latest = Number.parseFloat(sorted[0].price);
  const previous = Number.parseFloat(sorted[1].price);
  if (!Number.isFinite(latest) || !Number.isFinite(previous) || previous === 0) {
    return null;
  }
  const absolute = latest - previous;
  const percent = (absolute / previous) * 100;
  return {
    absolute,
    percent,
    referenceLabel: "vs. captura anterior",
  };
}

function startOfRange(latest: Date, range: PriceHistoryRange): Date {
  const d = new Date(latest);
  switch (range) {
    case "5D":
      d.setDate(d.getDate() - 5);
      return d;
    case "1M":
      d.setMonth(d.getMonth() - 1);
      return d;
    case "6M":
      d.setMonth(d.getMonth() - 6);
      return d;
    case "YTD":
      return new Date(d.getFullYear(), 0, 1);
    case "1Y":
      d.setFullYear(d.getFullYear() - 1);
      return d;
    case "ALL":
    default:
      return new Date(0);
  }
}

export function filterPricesByRange(
  records: MarketPriceRecord[],
  range: PriceHistoryRange,
): MarketPriceRecord[] {
  const asc = sortPricesByQuotedAtAsc(records);
  if (asc.length === 0 || range === "ALL") {
    return asc;
  }
  const latest = new Date(asc[asc.length - 1].quoted_at);
  const cutoff = startOfRange(latest, range);
  return asc.filter((row) => new Date(row.quoted_at) >= cutoff);
}

export function toChartPoints(records: MarketPriceRecord[]): {
  label: string;
  value: number;
  iso: string;
}[] {
  return sortPricesByQuotedAtAsc(records).map((row) => {
    const date = new Date(row.quoted_at);
    return {
      label: new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
      }).format(date),
      value: Number.parseFloat(row.price),
      iso: row.quoted_at,
    };
  });
}

export function assetPriceHistoryPath(assetId: string): string {
  return `/assets/${assetId}/price-history`;
}

export function formatQuotedAt(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function sourceLabel(source: string): string {
  const map: Record<string, string> = {
    MANUAL: "Manual",
    BRAPI: "BRAPI",
    YAHOO: "Yahoo",
    MOCK: "Mock",
  };
  return map[source] ?? source;
}