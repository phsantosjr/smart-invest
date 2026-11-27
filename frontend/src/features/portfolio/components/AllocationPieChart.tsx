import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, Tooltip } from "recharts";

import {
  CHART_TOOLTIP_ITEM_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_TOOLTIP_STYLE,
} from "../../../components/charts/chartTheme";
import type { AllocationSlice } from "../../../types/portfolio";
import { formatBrl } from "../../../utils/money";

type AllocationPieChartProps = {
  allocation: AllocationSlice[];
};

function formatPercent(value: number): string {
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

const PIE_SIZE = 224;
const INNER_RADIUS = 58;
const OUTER_RADIUS = 86;

export function AllocationPieChart({ allocation }: AllocationPieChartProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const totalMarketValue = useMemo(
    () => allocation.reduce((sum, slice) => sum + slice.value, 0),
    [allocation],
  );
  const pieSlices = useMemo(
    () => allocation.filter((slice) => slice.value > 0),
    [allocation],
  );
  const totalLabel = formatBrl(totalMarketValue);
  const summary = pieSlices
    .map((slice) => `${slice.label} ${formatPercent(slice.percent)} (${slice.amount})`)
    .join(", ");

  return (
    <section
      id="current-value-by-category"
      className="rounded-lg bg-surface-container-low p-space-md shadow-sm"
    >
      <header className="mb-space-md">
        <h2 className="font-headline text-base font-semibold text-on-surface">
          Valor atual por categoria
        </h2>
        <p className="text-xs text-on-surface-variant">
          Total em R$ por classe de ativo, com base na cotação atual (posição líquida)
        </p>
      </header>

      <div className="grid grid-cols-1 items-center gap-space-lg md:grid-cols-[minmax(12rem,16rem)_1fr]">
        <div
          className="relative mx-auto"
          style={{ width: PIE_SIZE, height: PIE_SIZE }}
          role="img"
          aria-label={
            pieSlices.length === 0
              ? "Sem valor de mercado para exibir no gráfico"
              : `Alocação por valor atual: ${summary}`
          }
        >
          {pieSlices.length === 0 ? (
            <div className="flex h-full w-full items-center justify-center rounded-full border border-outline-variant/30 bg-surface-container" />
          ) : (
            <PieChart width={PIE_SIZE} height={PIE_SIZE}>
              <Pie
                data={pieSlices}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={INNER_RADIUS}
                outerRadius={OUTER_RADIUS}
                paddingAngle={1}
                onMouseEnter={(_, index) => {
                  const slice = pieSlices[index];
                  if (slice) setHoveredId(slice.id);
                }}
                onMouseLeave={() => setHoveredId(null)}
              >
                {pieSlices.map((slice) => (
                  <Cell
                    key={slice.id}
                    fill={`var(${slice.colorVar})`}
                    opacity={hoveredId && hoveredId !== slice.id ? 0.45 : 1}
                    stroke="var(--si-surface-container-lowest)"
                    strokeWidth={1}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                formatter={(value, _name, item) => {
                  const slice = item.payload as AllocationSlice;
                  const num = typeof value === "number" ? value : Number(value);
                  return [`${formatBrl(num)} (${formatPercent(slice.percent)})`, slice.label];
                }}
              />
            </PieChart>
          )}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-space-lg text-center">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
              Total
            </span>
            <span className="font-headline text-sm font-bold tabular-nums text-on-surface">
              {totalLabel}
            </span>
          </div>
        </div>

        {allocation.length === 0 ? (
          <p className="text-sm text-on-surface-variant">
            Nenhuma posição com valor para exibir no gráfico.
          </p>
        ) : (
          <table className="w-full border-collapse text-left text-sm">
            <caption className="sr-only">
              Valor atual e participação percentual por categoria
            </caption>
            <thead>
              <tr className="border-b border-outline-variant/30 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                <th className="px-space-xs py-space-sm">Categoria</th>
                <th className="px-space-xs py-space-sm text-right">Valor atual</th>
                <th className="px-space-xs py-space-sm text-right">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {allocation.map((slice) => {
                const active = hoveredId === slice.id;
                return (
                  <tr
                    key={slice.id}
                    className={
                      active ? "bg-surface-container/80" : "hover:bg-surface-container/50"
                    }
                    onMouseEnter={() => setHoveredId(slice.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <th scope="row" className="px-space-xs py-space-sm font-medium text-on-surface">
                      <span className="flex items-center gap-space-sm">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-sm"
                          style={{ backgroundColor: `var(${slice.colorVar})` }}
                          aria-hidden
                        />
                        <span className="whitespace-nowrap">{slice.label}</span>
                      </span>
                    </th>
                    <td className="px-space-xs py-space-sm text-right tabular-nums text-on-surface">
                      {slice.amount}
                    </td>
                    <td className="px-space-xs py-space-sm text-right tabular-nums text-on-surface-variant">
                      {formatPercent(slice.percent)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}