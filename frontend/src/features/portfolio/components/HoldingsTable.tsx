import { useMemo, useState } from "react";

import { SensitiveText } from "../../../components/SensitiveText";
import type { HoldingRow } from "../../../types/portfolio";
import { MaterialIcon } from "../../../components/MaterialIcon";
import { UpdateMarketPriceModal } from "./UpdateMarketPriceModal";

type HoldingsTableProps = {
  holdings: HoldingRow[];
  totalCount: number;
  classCounts: Record<string, number>;
  onQuoteSaved?: () => void;
};

const VARIABLE_INCOME_TYPES = new Set(["STOCK", "FII", "FUND"]);

const classFilters = [
  { id: "all", label: "Todos" },
  { id: "Ações", label: "Ações" },
  { id: "FII", label: "FIIs" },
  { id: "Tesouro", label: "Tesouro Direto" },
  { id: "Renda Fixa", label: "Renda Fixa Manual" },
] as const;

export function HoldingsTable({
  holdings,
  totalCount,
  classCounts,
  onQuoteSaved,
}: HoldingsTableProps) {
  const [filter, setFilter] = useState<(typeof classFilters)[number]["id"]>("all");
  const [query, setQuery] = useState("");
  const [quoteTarget, setQuoteTarget] = useState<HoldingRow | null>(null);

  const filtered = useMemo(() => {
    const normalized = query.trim().toUpperCase();
    return holdings.filter((row) => {
      const matchesClass = filter === "all" || row.assetClass === filter;
      const matchesQuery =
        !normalized ||
        row.ticker.toUpperCase().includes(normalized) ||
        row.name.toUpperCase().includes(normalized);
      return matchesClass && matchesQuery;
    });
  }, [filter, holdings, query]);

  const filterCounts = classCounts;

  return (
    <section className="rounded-lg bg-surface-container-low p-space-md shadow-sm">
      <UpdateMarketPriceModal
        holding={quoteTarget}
        onClose={() => setQuoteTarget(null)}
        onSaved={() => onQuoteSaved?.()}
      />
      <HoldingsToolbar
        filter={filter}
        onFilter={setFilter}
        filterCounts={filterCounts}
        query={query}
        onQuery={setQuery}
      />
      <div className="overflow-x-auto">
        <table className="min-w-[860px] w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-outline-variant/30 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
              <th className="px-space-xs py-space-sm">Ativo / Código</th>
              <th className="px-space-xs py-space-sm">Tipo</th>
              <th className="px-space-xs py-space-sm">Titular</th>
              <th className="px-space-xs py-space-sm text-right">Qtd.</th>
              <th className="px-space-xs py-space-sm text-right">Preço Médio</th>
              <th className="px-space-xs py-space-sm text-right">Cotação Atual</th>
              <th className="px-space-xs py-space-sm text-right">Posição Líquida</th>
              <th className="px-space-xs py-space-sm text-right">Rentabilidade Total</th>
              <th className="w-12 px-space-xs py-space-sm text-center">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10 text-xs">
            {filtered.map((row) => (
              <tr key={row.id} className="group transition-colors hover:bg-surface-container/60">
                <td className="px-space-xs py-2.5">
                  <div className="flex items-center gap-space-xs">
                    <span className="text-xs font-bold text-on-surface">{row.ticker}</span>
                    <span className="max-w-[120px] truncate text-on-surface-variant">{row.name}</span>
                  </div>
                </td>
                <td className="px-space-xs py-2.5">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase ${row.assetClassBadge}`}
                  >
                    {row.assetClass}
                  </span>
                </td>
                <td className="px-space-xs py-2.5">
                  <div className="flex items-center gap-1">
                    <span
                      className={[
                        "flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold",
                        row.holderAccent === "primary"
                          ? "bg-primary-container text-on-primary-container"
                          : "bg-secondary-container text-on-secondary",
                      ].join(" ")}
                    >
                      {row.holderInitial}
                    </span>
                    <span className="font-medium text-on-surface">{row.holderName}</span>
                  </div>
                </td>
                <td className="px-space-xs py-2.5 text-right text-sm tabular-nums text-on-surface">
                  <SensitiveText>{row.quantity}</SensitiveText>
                </td>
                <td className="px-space-xs py-2.5 text-right text-sm tabular-nums text-on-surface-variant">
                  <SensitiveText>{row.averagePrice}</SensitiveText>
                </td>
                <td className="px-space-xs py-2.5 text-right text-sm tabular-nums text-on-surface">
                  <PriceCell row={row} />
                </td>
                <td className="px-space-xs py-2.5 text-right text-sm font-semibold tabular-nums text-on-surface">
                  <SensitiveText>{row.netPosition}</SensitiveText>
                </td>
                <td
                  className={[
                    "px-space-xs py-2.5 text-right text-sm font-medium tabular-nums",
                    row.returnTone === "gain" ? "text-b3-green" : "text-error",
                  ].join(" ")}
                >
                  <SensitiveText>{row.totalReturn}</SensitiveText>
                </td>
                <td className="px-space-xs py-2.5 text-center">
                  {VARIABLE_INCOME_TYPES.has(row.assetType) ? (
                    <button
                      type="button"
                      aria-label="Atualizar cotação"
                      title="Atualizar cotação"
                      onClick={() => setQuoteTarget(row)}
                      className="rounded p-1 text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                    >
                      <MaterialIcon name="price_change" size={18} />
                    </button>
                  ) : (
                    <span className="text-on-surface-variant/40">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <footer className="mt-space-md flex flex-col items-center justify-between gap-space-sm border-t border-outline-variant/20 pt-space-md text-xs text-on-surface-variant sm:flex-row">
        <p className="tabular-nums">
          Exibindo <span className="font-semibold text-on-surface">{filtered.length}</span> de{" "}
          <span className="font-semibold text-on-surface">{totalCount}</span> posições monitoradas
        </p>
        <div className="flex items-center gap-space-xs">
          <button
            type="button"
            disabled
            className="rounded bg-surface-container px-space-sm py-1 text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-40"
          >
            <MaterialIcon name="chevron_left" size={16} />
          </button>
          <span className="rounded bg-surface-container-high px-2 py-0.5 text-xs font-semibold text-on-surface">
            1
          </span>
          <span className="px-2 py-0.5 text-xs text-on-surface-variant">2</span>
          <span className="px-2 py-0.5 text-xs text-on-surface-variant">3</span>
          <button
            type="button"
            className="rounded bg-surface-container px-space-sm py-1 text-on-surface-variant transition-colors hover:bg-surface-container-high"
          >
            <MaterialIcon name="chevron_right" size={16} />
          </button>
        </div>
      </footer>
    </section>
  );
}

function PriceCell({ row }: { row: HoldingRow }) {
  return (
    <div className="flex flex-col items-end gap-0.5">
      <SensitiveText>{row.currentPrice}</SensitiveText>
      {row.lastQuotedAt ? (
        <span className="text-[10px] tabular-nums text-on-surface-variant">
          {row.lastQuotedAt}
        </span>
      ) : !row.hasMarketQuote ? (
        <span className="text-[10px] text-on-surface-variant">PM</span>
      ) : null}
    </div>
  );
}

function HoldingsToolbar({
  filter,
  onFilter,
  filterCounts,
  query,
  onQuery,
}: {
  filter: (typeof classFilters)[number]["id"];
  onFilter: (id: (typeof classFilters)[number]["id"]) => void;
  filterCounts: Record<string, number>;
  query: string;
  onQuery: (value: string) => void;
}) {
  return (
    <div className="mb-space-md flex flex-col justify-between gap-space-md md:flex-row md:items-center">
      <div className="flex select-none items-center gap-space-xs overflow-x-auto">
        {classFilters.map((item) => {
          const count = filterCounts[item.id === "all" ? "all" : item.id] ?? 0;
          const isActive = filter === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onFilter(item.id)}
              className={[
                "shrink-0 rounded px-space-md py-1.5 text-xs font-semibold transition-colors",
                isActive
                  ? "bg-surface-container-high text-on-surface"
                  : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
              ].join(" ")}
            >
              {item.label} ({item.id === "all" ? count : count})
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-space-sm">
        <div className="relative w-full sm:w-56">
          <MaterialIcon
            name="search"
            size={18}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-outline"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Filtrar por código..."
            className="h-8 w-full rounded bg-surface-container pl-8 pr-3 text-xs text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-secondary"
          />
        </div>
        <button
          type="button"
          className="flex h-8 shrink-0 items-center gap-space-xs rounded bg-surface-container px-space-md text-xs font-medium text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
        >
          <MaterialIcon name="file_download" size={16} />
          <span>CSV</span>
        </button>
      </div>
    </div>
  );
}