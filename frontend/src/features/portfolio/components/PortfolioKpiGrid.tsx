import type { KpiMetric } from "../../../types/portfolio";
import { MaterialIcon } from "../../../components/MaterialIcon";

type PortfolioKpiGridProps = {
  kpis: KpiMetric[];
};

export function PortfolioKpiGrid({ kpis }: PortfolioKpiGridProps) {
  return (
    <section className="mb-space-lg grid grid-cols-1 gap-space-md sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => (
        <KpiCard key={kpi.id} kpi={kpi} />
      ))}
    </section>
  );
}

function KpiCard({ kpi }: { kpi: KpiMetric }) {
  const valueClass = kpi.accentValue ? "text-tertiary" : "text-on-surface";
  const deltaClass = kpi.accentValue ? "text-tertiary font-medium" : "text-secondary font-semibold";

  return (
    <article className="relative flex flex-col justify-between overflow-hidden rounded-lg bg-surface-container-low p-space-md shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
          {kpi.label}
        </span>
        <MaterialIcon
          name={kpi.icon}
          size={18}
          className={kpi.accentValue ? "text-tertiary" : "text-secondary"}
        />
      </div>
      <div className="mt-space-sm">
        <p className={`font-headline text-2xl font-bold tracking-tight tabular-nums ${valueClass}`}>
          {kpi.value}
        </p>
        {kpi.delta ? (
          <div className="mt-1 flex items-center gap-space-xs">
            <span className={`flex items-center text-xs tabular-nums ${deltaClass}`}>
              {kpi.id === "net-worth" ? (
                <MaterialIcon name="arrow_upward" size={14} className="mr-0.5" />
              ) : null}
              {kpi.delta}
            </span>
            {kpi.deltaHint ? (
              <span className="text-xs text-on-surface-variant">{kpi.deltaHint}</span>
            ) : null}
          </div>
        ) : null}
      </div>
      {kpi.id === "net-worth" ? (
        <div className="mt-space-md flex items-end justify-between pt-space-xs">
          <span className="font-mono text-[11px] text-on-surface-variant">30D TREND</span>
          <svg className="h-6 w-28 text-secondary" viewBox="0 0 112 24" fill="none" aria-hidden>
            <path
              d="M0 20 L16 17 L32 19 L48 12 L64 14 L80 8 L96 9 L112 3"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.75"
            />
          </svg>
        </div>
      ) : kpi.footer ? (
        <div className="mt-space-md flex items-center justify-between pt-space-xs text-[11px] text-on-surface-variant">
          <span>{kpi.footer.left}</span>
          {kpi.footer.right ? (
            <span
              className={`font-medium tabular-nums ${
                kpi.footer.right.startsWith("-") ? "text-error" : "text-on-surface"
              }`}
            >
              {kpi.footer.right}
            </span>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}