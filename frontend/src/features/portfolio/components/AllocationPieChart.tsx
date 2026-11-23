import { useMemo, useState } from "react";

import type { AllocationSlice } from "../../../types/portfolio";
import { formatBrl } from "../../../utils/money";

type AllocationPieChartProps = {
  allocation: AllocationSlice[];
};

const VIEWBOX = 200;
const CENTER = VIEWBOX / 2;
const RADIUS = 72;
const STROKE_WIDTH = 28;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function formatPercent(value: number): string {
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

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

  let dashOffset = 0;
  const arcs = pieSlices.map((slice) => {
    const dash = totalMarketValue > 0 ? (slice.value / totalMarketValue) * CIRCUMFERENCE : 0;
    const offset = dashOffset;
    dashOffset += dash;
    return { slice, dash, offset };
  });

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
        <div className="relative mx-auto h-56 w-56">
          <svg
            viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
            className="h-full w-full"
            role="img"
            aria-label={
              pieSlices.length === 0
                ? "Sem valor de mercado para exibir no gráfico"
                : `Alocação por valor atual: ${summary}`
            }
          >
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              className="stroke-surface-container-highest"
              strokeWidth={STROKE_WIDTH}
            />
            {arcs.map(({ slice, dash, offset }) => (
              <circle
                key={slice.id}
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill="none"
                stroke={`var(${slice.colorVar})`}
                strokeWidth={STROKE_WIDTH}
                strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${CENTER} ${CENTER})`}
                className={
                  hoveredId && hoveredId !== slice.id
                    ? "opacity-45 transition-opacity duration-200 motion-reduce:transition-none"
                    : "transition-opacity duration-200 motion-reduce:transition-none"
                }
                onMouseEnter={() => setHoveredId(slice.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <title>
                  {slice.label}: {slice.amount} ({formatPercent(slice.percent)})
                </title>
              </circle>
            ))}
          </svg>
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
