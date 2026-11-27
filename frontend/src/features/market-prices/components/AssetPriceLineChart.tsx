import { useMemo, useState } from "react";

import { AppLineChart } from "../../../components/charts/AppLineChart";
import type { MarketPriceRecord } from "../../../services/marketPricesApi";
import {
  filterPricesByRange,
  PRICE_HISTORY_RANGES,
  toChartPoints,
  type PriceHistoryRange,
} from "../utils/priceHistory";

type AssetPriceLineChartProps = {
  records: MarketPriceRecord[];
  tickerLabel: string;
};

export function AssetPriceLineChart({ records, tickerLabel }: AssetPriceLineChartProps) {
  const [range, setRange] = useState<PriceHistoryRange>("ALL");

  const filtered = useMemo(() => filterPricesByRange(records, range), [records, range]);
  const chartData = useMemo(() => toChartPoints(filtered), [filtered]);

  return (
    <section className="rounded-lg border border-outline-variant/30 bg-surface-container-low p-space-md shadow-sm">
      <div className="mb-space-md flex flex-wrap gap-1 border-b border-outline-variant/25 pb-space-sm">
        {PRICE_HISTORY_RANGES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setRange(item.id)}
            className={[
              "rounded px-2.5 py-1 text-[11px] font-semibold tabular-nums transition-colors",
              range === item.id
                ? "bg-surface-container-high text-on-surface"
                : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
            ].join(" ")}
          >
            {item.label}
          </button>
        ))}
      </div>
      <AppLineChart
        data={chartData}
        ariaLabel={`Histórico de preço de ${tickerLabel}`}
        height={300}
      />
    </section>
  );
}