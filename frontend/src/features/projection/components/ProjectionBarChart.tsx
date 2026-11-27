import type { ProjectionChartBar } from "../../../types/projection";
import { formatBrl } from "../../../utils/money";

type ProjectionBarChartProps = {
  bars: ProjectionChartBar[];
};

export function ProjectionBarChart({ bars }: ProjectionBarChartProps) {
  if (bars.length === 0) {
    return (
      <p className="text-sm text-on-surface-variant">Nenhum dado para exibir no gráfico.</p>
    );
  }

  const values = bars.map((b) => Number.parseFloat(b.portfolio_value));
  const max = Math.max(...values, 1);

  return (
    <div className="w-full overflow-x-auto">
      <div
        className="flex min-w-[min(100%,520px)] items-end gap-1 px-1 pt-6"
        style={{ height: 220 }}
        aria-label="Gráfico de patrimônio projetado"
      >
        {bars.map((bar) => {
          const value = Number.parseFloat(bar.portfolio_value);
          const heightPct = (value / max) * 100;
          const shortLabel = /^\d{4}-\d{2}$/.test(bar.period_label)
            ? bar.period_label.replace(/^(\d{4})-(\d{2})$/, "$2/$1")
            : bar.period_label;
          return (
            <div
              key={bar.period_label}
              className="flex min-w-6 flex-1 flex-col items-center justify-end gap-1"
            >
              <span
                className="w-full max-w-10 rounded-t bg-secondary tabular-nums"
                style={{ height: `${Math.max(heightPct, 4)}%` }}
                title={`${bar.period_label}: ${formatBrl(value)}`}
              />
              <span className="max-w-[3rem] truncate text-[10px] text-on-surface-variant">
                {shortLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}