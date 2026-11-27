import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
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

export type AppLineChartPoint = {
  label: string;
  value: number;
  iso: string;
};

type AppLineChartProps = {
  data: AppLineChartPoint[];
  ariaLabel: string;
  stroke?: keyof typeof CHART_COLORS;
  valueFormatter?: (value: number) => string;
  height?: number;
};

const DEFAULT_HEIGHT = 280;

export function AppLineChart({
  data,
  ariaLabel,
  stroke = "secondary",
  valueFormatter = formatBrl,
  height = DEFAULT_HEIGHT,
}: AppLineChartProps) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-on-surface-variant">Nenhum dado para exibir no gráfico.</p>
    );
  }

  const strokeColor = CHART_COLORS[stroke];
  const gradientId = `si-line-fill-${stroke}`;

  return (
    <div className="w-full" aria-label={ariaLabel} role="img">
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data} margin={{ top: 12, right: 12, left: 4, bottom: 8 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={0.35} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="var(--si-outline-variant)"
            strokeOpacity={0.35}
            vertical={false}
          />
          <XAxis dataKey="label" tick={CHART_AXIS_TICK} minTickGap={24} />
          <YAxis
            tick={CHART_AXIS_TICK}
            width={72}
            domain={["auto", "auto"]}
            tickFormatter={(v: number) => valueFormatter(v).replace(/\s/g, "\u00a0")}
          />
          <Tooltip
            contentStyle={CHART_TOOLTIP_STYLE}
            labelStyle={CHART_TOOLTIP_LABEL_STYLE}
            formatter={(value) => [
              valueFormatter(Number(value)),
              "Preço",
            ]}
            itemStyle={CHART_TOOLTIP_ITEM_STYLE}
            labelFormatter={(_, payload) => {
              const row = payload?.[0]?.payload as AppLineChartPoint | undefined;
              if (!row?.iso) {
                return "";
              }
              return new Intl.DateTimeFormat("pt-BR", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(row.iso));
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="none"
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={strokeColor}
            strokeWidth={2}
            dot={{ r: 3, fill: strokeColor, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}