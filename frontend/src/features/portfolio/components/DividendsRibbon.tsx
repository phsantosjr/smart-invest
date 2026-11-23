import type { UpcomingDividend } from "../../../types/portfolio";
import { MaterialIcon } from "../../../components/MaterialIcon";

const tickerTone: Record<UpcomingDividend["tickerAccent"], string> = {
  primary: "text-primary",
  secondary: "text-secondary",
  tertiary: "text-tertiary",
};

type DividendsRibbonProps = {
  dividends: UpcomingDividend[];
};

export function DividendsRibbon({ dividends }: DividendsRibbonProps) {
  return (
    <section className="mb-space-lg flex items-center gap-space-md overflow-x-auto text-nowrap rounded-lg bg-surface-container-low p-space-sm">
      <div className="flex shrink-0 items-center gap-space-xs rounded bg-surface-container px-space-sm py-1">
        <MaterialIcon name="calendar_month" size={16} className="text-tertiary" />
        <span className="text-[11px] font-semibold uppercase text-on-surface-variant">
          Agenda Proventos
        </span>
      </div>
      <div className="flex items-center gap-space-lg text-xs">
        {dividends.map((item, index) => (
          <div key={`${item.ticker}-${item.dateLabel}`} className="flex items-center gap-space-lg">
            {index > 0 ? <span className="h-1 w-1 rounded-full bg-surface-variant" /> : null}
            <div className="flex items-center gap-space-xs tabular-nums">
              <span className="rounded bg-surface-container-highest px-1.5 py-0.5 text-[10px] font-bold text-on-surface">
                {item.dateLabel}
              </span>
              <span className={`text-xs font-semibold ${tickerTone[item.tickerAccent]}`}>
                {item.ticker}
              </span>
              <span className="text-on-surface-variant">{item.description}</span>
              <span className="font-semibold text-on-surface">{item.amount}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}