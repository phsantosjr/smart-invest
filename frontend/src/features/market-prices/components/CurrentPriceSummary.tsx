import type { MarketPriceRecord } from "../../../services/marketPricesApi";
import { formatBrl } from "../../../utils/money";
import {
  computeChangeFromPrevious,
  formatQuotedAt,
  latestMarketPrice,
  sourceLabel,
} from "../utils/priceHistory";

type CurrentPriceSummaryProps = {
  records: MarketPriceRecord[];
  ticker?: string | null;
  large?: boolean;
};

export function CurrentPriceSummary({ records, ticker, large = false }: CurrentPriceSummaryProps) {
  const latest = latestMarketPrice(records);
  const change = computeChangeFromPrevious(records);

  if (!latest) {
    return (
      <p className="text-sm text-on-surface-variant">
        Sem cotação de mercado registrada{ticker ? ` para ${ticker}` : ""}.
      </p>
    );
  }

  const price = formatBrl(latest.price);
  const positive = change ? change.percent >= 0 : true;

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-baseline gap-space-sm">
        <p
          className={[
            "font-semibold tabular-nums text-on-surface",
            large ? "text-3xl tracking-tight" : "text-xl",
          ].join(" ")}
        >
          {price}
        </p>
        {change ? (
          <span
            className={[
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
              positive
                ? "bg-tertiary-container/80 text-on-tertiary-container"
                : "bg-error-container/60 text-error",
            ].join(" ")}
          >
            {positive ? "↑" : "↓"} {Math.abs(change.percent).toFixed(2)}%
          </span>
        ) : null}
      </div>
      {change ? (
        <p className="text-xs text-on-surface-variant tabular-nums">
          {positive ? "+" : ""}
          {formatBrl(change.absolute)} {change.referenceLabel}
        </p>
      ) : null}
      <p className="text-[11px] text-on-surface-variant">
        {formatQuotedAt(latest.quoted_at)} · {sourceLabel(latest.source)}
      </p>
    </div>
  );
}