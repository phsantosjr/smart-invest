import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { dateRangeForPreset } from "../src/features/transactions/utils/dateRange";

describe("dateRangeForPreset", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T12:00:00-03:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns today for hoje", () => {
    expect(dateRangeForPreset("today")).toEqual({
      startDate: "2026-03-15",
      endDate: "2026-03-15",
    });
  });

  it("returns yesterday for ontem", () => {
    expect(dateRangeForPreset("yesterday")).toEqual({
      startDate: "2026-03-14",
      endDate: "2026-03-14",
    });
  });

  it("returns inclusive 7-day window for últimos 7 dias", () => {
    expect(dateRangeForPreset("last7")).toEqual({
      startDate: "2026-03-09",
      endDate: "2026-03-15",
    });
  });

  it("returns inclusive 30-day window for últimos 30 dias", () => {
    expect(dateRangeForPreset("last30")).toEqual({
      startDate: "2026-02-14",
      endDate: "2026-03-15",
    });
  });
});