import {
  Bar,
  BarChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatBrl } from "../../utils/money";
import {
  CHART_AXIS_TICK,
  CHART_COLORS,
  CHART_TOOLTIP_ITEM_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_TOOLTIP_STYLE,
} from "./chartTheme";

export type AppBarChartPoint = {
  label: string;
  value: number;
};

type AppBarChartProps = {
  data: AppBarChartPoint[];
  ariaLabel: string;
  fill?: keyof typeof CHART_COLORS;
  slantXLabels?: boolean;
  valueFormatter?: (value: number) => string;
};

const CHART_HEIGHT = 240;

export function AppBarChart({
  data,
  ariaLabel,
  fill = "secondary",
  slantXLabels = false,
  valueFormatter = formatBrl,
}: AppBarChartProps) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-on-surface-variant">Nenhum dado para exibir no gráfico.</p>
    );
  }

  const chartWidth = Math.max(520, data.length * (slantXLabels ? 36 : 48));

  return (
    <div className="w-full overflow-x-auto" aria-label={ariaLabel} role="img">
      <BarChart
        width={chartWidth}
        height={CHART_HEIGHT}
        data={data}
        margin={{ top: 8, right: 8, left: 4, bottom: slantXLabels ? 56 : 24 }}
      >
        <CartesianGrid
          stroke="var(--si-outline-variant)"
          strokeOpacity={0.35}
          vertical={false}
        />
        <XAxis
          dataKey="label"
          tick={CHART_AXIS_TICK}
          interval={0}
          angle={slantXLabels ? -45 : 0}
          textAnchor={slantXLabels ? "end" : "middle"}
          height={slantXLabels ? 56 : 28}
        />
        <YAxis
          tick={CHART_AXIS_TICK}
          width={72}
          tickFormatter={(v: number) =>
            valueFormatter(v).replace(/\s/g, "\u00a0")
          }
        />
        <Tooltip
          cursor={{ fill: "var(--si-surface-container-high)", opacity: 0.35 }}
          contentStyle={CHART_TOOLTIP_STYLE}
          labelStyle={CHART_TOOLTIP_LABEL_STYLE}
          itemStyle={CHART_TOOLTIP_ITEM_STYLE}
          formatter={(value) => {
            const num = typeof value === "number" ? value : Number(value);
            return [valueFormatter(num), "Total recebido"];
          }}
        />
        <Bar
          dataKey="value"
          fill={CHART_COLORS[fill]}
          radius={[4, 4, 0, 0]}
          maxBarSize={40}
        />
      </BarChart>
    </div>
  );
}