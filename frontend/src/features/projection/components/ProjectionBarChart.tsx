import { AppBarChart, type AppBarChartPoint } from "../../../components/charts/AppBarChart";
import { formatBrl } from "../../../utils/money";
import type { ProjectionChartBar } from "../../../types/projection";

type ProjectionBarChartProps = {
  bars: ProjectionChartBar[];
};

function formatPeriodLabel(period_label: string): string {
  return /^\d{4}-\d{2}$/.test(period_label)
    ? period_label.replace(/^(\d{4})-(\d{2})$/, "$2/$1")
    : period_label;
}

export function ProjectionBarChart({ bars }: ProjectionBarChartProps) {
  const data: AppBarChartPoint[] = bars.map((bar) => ({
    label: formatPeriodLabel(bar.period_label),
    value: Number.parseFloat(bar.portfolio_value),
  }));

  return (
    <AppBarChart
      data={data}
      ariaLabel="Gráfico de patrimônio projetado"
      fill="secondary"
      valueFormatter={formatBrl}
    />
  );
}