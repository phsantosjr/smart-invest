export function isoDateOffset(daysFromToday: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
}

export type TransactionDateRangePresetId = "today" | "yesterday" | "last7" | "last30";

export const TRANSACTION_DATE_RANGE_PRESETS: {
  id: TransactionDateRangePresetId;
  label: string;
}[] = [
  { id: "today", label: "Hoje" },
  { id: "yesterday", label: "Ontem" },
  { id: "last7", label: "Últimos 7 dias" },
  { id: "last30", label: "Últimos 30 dias" },
];

export function dateRangeForPreset(preset: TransactionDateRangePresetId): {
  startDate: string;
  endDate: string;
} {
  const today = isoDateOffset(0);
  switch (preset) {
    case "today":
      return { startDate: today, endDate: today };
    case "yesterday": {
      const yesterday = isoDateOffset(-1);
      return { startDate: yesterday, endDate: yesterday };
    }
    case "last7":
      return { startDate: isoDateOffset(-6), endDate: today };
    case "last30":
      return { startDate: isoDateOffset(-29), endDate: today };
  }
}

export function matchesDateRangePreset(
  startDate: string,
  endDate: string,
  preset: TransactionDateRangePresetId,
): boolean {
  const range = dateRangeForPreset(preset);
  return startDate === range.startDate && endDate === range.endDate;
}