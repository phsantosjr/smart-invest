import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { useAppSelector } from "../../../app/hooks";
import { MaterialIcon } from "../../../components/MaterialIcon";
import { getErrorMessage } from "../../../services/api";
import { fetchBrokerageAccounts } from "../../../services/accountsApi";
import { fetchAssets } from "../../../services/assetsApi";
import { fetchFixedIncomeValuations } from "../../../services/fixedIncomeValuationsApi";
import { fetchPortfolio } from "../../../services/portfolioApi";
import { formatBrl } from "../../../utils/money";
import { UpdateBalanceDrawer } from "../components/UpdateBalanceDrawer";
import type { IndexerFilter } from "../utils/fixedIncomeDisplay";
import {
  buildFixedIncomeSummary,
  formatSignedBrl,
  formatSignedPercent,
  mapFixedIncomeRows,
  type FixedIncomeRow,
} from "../utils/mapFixedIncomeView";

type TitularFilter = "all" | "self" | "other";

const INDEXER_TABS: { id: IndexerFilter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "cdi", label: "Pós-fixado CDI" },
  { id: "pre", label: "Prefixado" },
  { id: "ipca", label: "IPCA+ / Inflação" },
  { id: "exempt", label: "Isentos de IR" },
];

export function FixedIncomePage() {
  const currentUser = useAppSelector((state) => state.auth.currentUser);

  const [rows, setRows] = useState<FixedIncomeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [indexerFilter, setIndexerFilter] = useState<IndexerFilter>("all");
  const [titularFilter, setTitularFilter] = useState<TitularFilter>("all");
  const [search, setSearch] = useState("");
  const [drawerRow, setDrawerRow] = useState<FixedIncomeRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [portfolio, accounts, assets, valuations] = await Promise.all([
        fetchPortfolio("household"),
        fetchBrokerageAccounts(),
        fetchAssets(),
        fetchFixedIncomeValuations(),
      ]);
      setRows(
        mapFixedIncomeRows({
          positions: portfolio.positions,
          assets,
          accounts,
          valuations,
          currentUser,
        }),
      );
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => buildFixedIncomeSummary(rows), [rows]);

  const indexerCounts = useMemo(() => {
    const counts: Record<IndexerFilter, number> = {
      all: rows.length,
      cdi: 0,
      pre: 0,
      ipca: 0,
      exempt: 0,
    };
    for (const row of rows) {
      for (const tag of row.indexerTags) {
        counts[tag] += 1;
      }
    }
    return counts;
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesIndexer =
        indexerFilter === "all" || row.indexerTags.includes(indexerFilter);
      const matchesTitular =
        titularFilter === "all" ||
        (titularFilter === "self" && currentUser?.id === row.userId) ||
        (titularFilter === "other" && currentUser?.id !== row.userId);
      const matchesSearch = !query || row.searchBlob.includes(query);
      return matchesIndexer && matchesTitular && matchesSearch;
    });
  }, [currentUser?.id, indexerFilter, rows, search, titularFilter]);

  const filteredInvested = filteredRows.reduce((sum, row) => sum + row.investedAmount, 0);
  const filteredNet = filteredRows.reduce((sum, row) => sum + row.netBalance, 0);

  return (
  <div className="flex w-full flex-col pb-space-xl">
      <PageHeader onOpenBatch={() => setDrawerRow(rows[0] ?? null)} />
      {error ? (
        <p
          role="alert"
          className="mb-space-md rounded border border-error/30 bg-error-container/20 px-space-md py-space-sm text-sm text-error"
        >
          {error}
        </p>
      ) : null}
      {loading ? (
        <p className="text-sm text-on-surface-variant">Carregando renda fixa…</p>
      ) : (
        <>
          <KpiGrid summary={summary} />
          <FilterBar
            indexerFilter={indexerFilter}
            indexerCounts={indexerCounts}
            onIndexerFilter={setIndexerFilter}
            titularFilter={titularFilter}
            onTitularFilter={setTitularFilter}
            search={search}
            onSearch={setSearch}
            holderShortName={currentUser?.name ?? "Titular"}
          />
          <PositionsTable
            rows={filteredRows}
            totalCount={rows.length}
            investedTotal={filteredInvested}
            netProjected={filteredNet}
            onUpdate={setDrawerRow}
          />
          <InfoNotice />
        </>
      )}
      <UpdateBalanceDrawer
        row={drawerRow}
        open={drawerRow != null}
        onClose={() => setDrawerRow(null)}
        onSaved={() => void load()}
      />
      {drawerRow ? (
        <button
          type="button"
          aria-label="Fechar painel"
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setDrawerRow(null)}
        />
      ) : null}
    </div>
  );
}

function PageHeader({ onOpenBatch }: { onOpenBatch: () => void }) {
  return (
    <div className="flex flex-col gap-space-md py-space-md md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col gap-space-xs">
        <div className="flex flex-wrap items-center gap-space-sm">
          <h1 className="font-headline text-headline-lg tracking-tight text-on-surface">
            Renda Fixa &amp; Títulos Manuais (Sem Ticker B3)
          </h1>
          <span className="inline-flex items-center rounded bg-surface-container-high px-2 py-0.5 text-label-sm font-label-sm uppercase tracking-wider text-on-surface-variant">
            OTC • Balcão
          </span>
        </div>
        <p className="text-body-sm font-body-sm text-on-surface-variant">
          Gestão unificada de ativos bancários, títulos de crédito privado isentos e emissões sem
          código B3 institucional.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-space-sm">
        <Link
          to="/transactions"
          className="flex h-9 items-center gap-1.5 rounded bg-surface-container-high px-space-md text-label-md font-label-md text-on-surface shadow-sm transition-colors hover:bg-surface-bright"
        >
          <MaterialIcon name="receipt_long" size={18} />
          Histórico de extratos
        </Link>
        <button
          type="button"
          onClick={onOpenBatch}
          className="flex h-9 items-center gap-1.5 rounded bg-secondary-container px-space-md text-label-md font-label-md text-on-secondary shadow-sm transition-opacity hover:opacity-90"
        >
          <MaterialIcon name="rule" size={18} />
          Atualizar saldos em lote
        </button>
        <Link
          to="/assets"
          className="flex h-9 items-center gap-1.5 rounded bg-primary-container px-space-md text-label-md font-label-md text-on-primary-container shadow-md transition-opacity hover:opacity-95"
        >
          <MaterialIcon name="add" size={18} />
          Novo título manual
        </Link>
      </div>
    </div>
  );
}

function KpiGrid({ summary }: { summary: ReturnType<typeof buildFixedIncomeSummary> }) {
  return (
    <div className="mt-space-md grid grid-cols-1 gap-space-md sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label="Patrimônio renda fixa"
        icon="account_balance_wallet"
        iconTone="text-primary"
        value={formatBrl(summary.totalGross)}
        footer={
          <>
            <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
            <span>
              {summary.activeCount} título{summary.activeCount === 1 ? "" : "s"} ativo
              {summary.activeCount === 1 ? "" : "s"} em custódia
            </span>
          </>
        }
      />
      <KpiCard
        label="Rentabilidade média"
        icon="query_stats"
        iconTone="text-secondary"
        valueTone="text-secondary"
        value={
          summary.gainPercentOnInvested > 0
            ? formatSignedPercent(summary.gainPercentOnInvested)
            : "—"
        }
        footer={
          <span>
            Lucro bruto {formatSignedBrl(summary.totalGain)} sobre {formatBrl(summary.totalInvested)}{" "}
            aportados
          </span>
        }
      />
      <KpiCard
        label="Próximos vencimentos (24m)"
        icon="event_upcoming"
        iconTone="text-tertiary"
        valueTone="text-tertiary"
        value={formatBrl(summary.upcomingMaturityValue)}
        footer={
          <>
            <span className="rounded bg-surface-container-high px-1.5 py-0.5 font-mono-financial text-numeric-mono-sm text-tertiary">
              {summary.upcomingMaturityCount} título
              {summary.upcomingMaturityCount === 1 ? "" : "s"}
            </span>
            <span>com liquidez estimada</span>
          </>
        }
      />
      <KpiCard
        label="Lucro bruto acumulado"
        icon="trending_up"
        iconTone="text-secondary"
        valueTone="text-secondary"
        value={formatSignedBrl(summary.totalGain)}
        footer={
          <>
            <MaterialIcon name="arrow_upward" size={14} />
            <span className="font-mono-financial font-semibold tabular-nums">
              {formatSignedPercent(summary.gainPercentOnInvested)}
            </span>
            <span className="text-on-surface-variant">
              sobre {formatBrl(summary.totalInvested)} aportados
            </span>
          </>
        }
      />
    </div>
  );
}

function KpiCard({
  label,
  icon,
  iconTone,
  value,
  valueTone = "text-on-surface",
  footer,
}: {
  label: string;
  icon: string;
  iconTone: string;
  value: string;
  valueTone?: string;
  footer: ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between rounded bg-surface-container p-space-md shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-label-sm font-label-sm uppercase tracking-wider text-on-surface-variant">
          {label}
        </span>
        <div
          className={`flex h-7 w-7 items-center justify-center rounded bg-surface-container-high ${iconTone}`}
        >
          <MaterialIcon name={icon} size={18} />
        </div>
      </div>
      <div className="mt-space-md">
        <div
          className={`font-mono-financial text-numeric-mono-lg tabular-nums tracking-tight ${valueTone}`}
        >
          {value}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1 text-label-sm font-label-sm text-on-surface-variant">
          {footer}
        </div>
      </div>
    </div>
  );
}

function FilterBar({
  indexerFilter,
  indexerCounts,
  onIndexerFilter,
  titularFilter,
  onTitularFilter,
  search,
  onSearch,
  holderShortName,
}: {
  indexerFilter: IndexerFilter;
  indexerCounts: Record<IndexerFilter, number>;
  onIndexerFilter: (value: IndexerFilter) => void;
  titularFilter: TitularFilter;
  onTitularFilter: (value: TitularFilter) => void;
  search: string;
  onSearch: (value: string) => void;
  holderShortName: string;
}) {
  return (
    <div className="mt-space-lg flex flex-col items-stretch justify-between gap-space-sm rounded bg-surface-container-low p-space-sm lg:flex-row lg:items-center">
      <div className="flex items-center gap-1 overflow-x-auto select-none">
        {INDEXER_TABS.map((tab) => {
          const active = indexerFilter === tab.id;
          const count = indexerCounts[tab.id];
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onIndexerFilter(tab.id)}
              className={
                active
                  ? "whitespace-nowrap rounded bg-surface-container-high px-3 py-1.5 text-label-md font-label-md font-semibold text-on-surface transition-colors"
                  : "whitespace-nowrap rounded px-3 py-1.5 text-label-md font-label-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
              }
            >
              {tab.label} ({count})
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-space-sm">
        <div className="flex items-center gap-1 rounded bg-surface-container px-1 py-1">
          <span className="px-1 text-label-sm font-label-sm uppercase tracking-wider text-on-surface-variant">
            Titular:
          </span>
          <TitularPill
            active={titularFilter === "all"}
            onClick={() => onTitularFilter("all")}
            label="Todos"
          />
          <TitularPill
            active={titularFilter === "self"}
            onClick={() => onTitularFilter("self")}
            label={holderShortName.split(" ")[0] ?? "Eu"}
          />
          <TitularPill
            active={titularFilter === "other"}
            onClick={() => onTitularFilter("other")}
            label="Outros"
          />
        </div>
        <div className="relative flex min-w-[220px] items-center">
          <MaterialIcon
            name="search"
            size={18}
            className="pointer-events-none absolute left-2.5 text-on-surface-variant"
          />
          <input
            id="fixed-income-search"
            type="search"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Emissor ou instituição…"
            className="h-8 w-full rounded bg-surface-container pl-8 pr-3 text-body-sm font-body-sm text-on-surface placeholder:text-on-surface-variant focus:bg-surface-container-high focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}

function TitularPill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded bg-surface-bright px-2 py-0.5 text-label-sm font-label-sm font-semibold text-on-surface"
          : "rounded px-2 py-0.5 text-label-sm font-label-sm text-on-surface-variant hover:text-on-surface"
      }
    >
      {label}
    </button>
  );
}

function PositionsTable({
  rows,
  totalCount,
  investedTotal,
  netProjected,
  onUpdate,
}: {
  rows: FixedIncomeRow[];
  totalCount: number;
  investedTotal: number;
  netProjected: number;
  onUpdate: (row: FixedIncomeRow) => void;
}) {
  if (rows.length === 0) {
    return (
      <section className="mt-space-md rounded bg-surface-container p-space-lg text-sm text-on-surface-variant shadow-sm">
        Nenhum título de renda fixa com posição aberta. Cadastre o ativo em{" "}
        <Link to="/assets" className="font-medium text-on-surface">
          Ativos
        </Link>{" "}
        e registre a marcação em{" "}
        <Link to="/transactions/new" className="font-medium text-on-surface">
          Novo lançamento
        </Link>
        .
      </section>
    );
  }

  return (
    <div className="mt-space-md w-full overflow-hidden rounded bg-surface-container shadow-sm">
      <div className="w-full overflow-x-auto">
        <table className="min-w-[1100px] w-full border-collapse text-left">
          <thead>
            <tr className="select-none bg-surface-container-high text-label-sm font-label-sm uppercase tracking-wider text-on-surface-variant">
              <th className="px-space-md py-2.5 font-semibold">Título / emissor</th>
              <th className="px-space-md py-2.5 font-semibold">Indexador &amp; taxa</th>
              <th className="px-space-md py-2.5 font-semibold">Isenção fiscal</th>
              <th className="px-space-md py-2.5 font-semibold">Titular</th>
              <th className="px-space-md py-2.5 font-semibold">Custodiante</th>
              <th className="px-space-md py-2.5 font-semibold">Vencimento</th>
              <th className="px-space-md py-2.5 text-right font-semibold">Aporte inicial</th>
              <th className="px-space-md py-2.5 text-right font-semibold">Saldo bruto atual</th>
              <th className="px-space-md py-2.5 text-right font-semibold">Saldo líquido</th>
              <th className="px-space-md py-2.5 text-right font-semibold">Rent. acumulada</th>
              <th className="px-space-md py-2.5 text-center font-semibold">Última atualiz.</th>
              <th className="px-space-md py-2.5 text-right font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-container-high/40 text-body-sm font-body-sm">
            {rows.map((row) => (
              <tr
                key={row.id}
                className="group transition-colors hover:bg-surface-container-high/30"
              >
                <td className="px-space-md py-3">
                  <div className="flex items-center gap-space-sm">
                    <span
                      className={`rounded px-1.5 py-0.5 text-label-sm font-label-sm font-bold tracking-tight ${row.instrumentBadgeClass}`}
                    >
                      {row.instrumentBadge}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-label-md font-label-md font-semibold text-on-surface">
                        {row.title}
                      </span>
                      <span className="text-body-sm font-body-sm text-on-surface-variant">
                        {row.issuerLine}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-space-md py-3">
                  <div className="flex flex-col">
                    <span className="font-mono-financial text-numeric-mono-sm font-semibold tabular-nums text-secondary">
                      {row.indexerPrimary}
                    </span>
                    <span className="text-body-sm font-body-sm text-on-surface-variant">
                      {row.indexerSecondary}
                    </span>
                  </div>
                </td>
                <td className="px-space-md py-3">
                  <TaxBadge exempt={row.taxExempt} label={row.taxLabel} />
                </td>
                <td className="px-space-md py-3">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-label-sm font-label-sm ${
                        row.holderAccent === "primary"
                          ? "bg-secondary-container text-on-secondary"
                          : "bg-primary-container text-on-primary-container"
                      }`}
                    >
                      {row.holderInitial}
                    </span>
                    <span className="text-body-sm font-body-sm text-on-surface">{row.holderName}</span>
                  </div>
                </td>
                <td className="px-space-md py-3 text-body-sm font-body-sm text-on-surface">
                  {row.custodian}
                </td>
                <td className="px-space-md py-3">
                  {row.maturityLine ? (
                    <span className="font-mono-financial text-numeric-mono-sm tabular-nums text-on-surface-variant">
                      {row.maturityLine}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-space-md py-3 text-right font-mono-financial text-numeric-mono-sm tabular-nums text-on-surface">
                  {formatBrl(row.investedAmount)}
                </td>
                <td className="px-space-md py-3 text-right font-mono-financial text-numeric-mono-md font-semibold tabular-nums text-on-surface">
                  {formatBrl(row.grossBalance)}
                </td>
                <td className="px-space-md py-3 text-right font-mono-financial text-numeric-mono-sm font-medium tabular-nums text-secondary">
                  {formatBrl(row.netBalance)}
                </td>
                <td className="px-space-md py-3 text-right">
                  <div className="flex flex-col items-end">
                    <span className="font-mono-financial text-numeric-mono-sm font-medium tabular-nums text-secondary">
                      {formatSignedBrl(row.gainAmount)}
                    </span>
                    <span className="text-label-sm font-label-sm tabular-nums text-secondary">
                      {formatSignedPercent(row.gainPercent)}
                    </span>
                  </div>
                </td>
                <td className="px-space-md py-3 text-center">
                  <span
                    className={`rounded bg-surface-container-high px-1.5 py-0.5 text-label-sm font-label-sm ${
                      row.hasValuation ? "text-secondary" : "text-on-surface-variant"
                    }`}
                  >
                    {row.valuationRecency}
                  </span>
                </td>
                <td className="px-space-md py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onUpdate(row)}
                      className="flex h-7 items-center gap-1 rounded bg-surface-container-high px-2.5 text-label-sm font-label-sm text-on-surface transition-colors hover:bg-primary-container hover:text-on-primary-container"
                    >
                      <MaterialIcon name="edit" size={15} />
                      Atualizar saldo
                    </button>
                    <Link
                      to={`/fixed-income/${row.assetId}`}
                      title="Ver extrato"
                      className="flex h-7 w-7 items-center justify-center rounded bg-surface-container-high text-on-surface-variant transition-colors hover:bg-surface-bright hover:text-on-surface"
                    >
                      <MaterialIcon name="history" size={16} />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TableFooter
        visibleCount={rows.length}
        totalCount={totalCount}
        investedTotal={investedTotal}
        netProjected={netProjected}
      />
    </div>
  );
}

function TaxBadge({ exempt, label }: { exempt: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-label-sm font-label-sm ${
        exempt
          ? "bg-surface-container-highest font-semibold text-secondary"
          : "bg-surface-container-highest text-on-surface-variant"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${exempt ? "bg-secondary" : "bg-error"}`}
      />
      {label}
    </span>
  );
}

function TableFooter({
  visibleCount,
  totalCount,
  investedTotal,
  netProjected,
}: {
  visibleCount: number;
  totalCount: number;
  investedTotal: number;
  netProjected: number;
}) {
  return (
    <div className="flex flex-col items-center justify-between gap-space-xs border-t border-surface-container-high/40 bg-surface-container-low px-space-md py-space-sm text-label-sm font-label-sm text-on-surface-variant sm:flex-row">
      <div className="flex flex-wrap items-center gap-space-md">
        <span>
          Mostrando <strong className="text-on-surface">{visibleCount}</strong> de{" "}
          <strong className="text-on-surface">{totalCount}</strong> títulos cadastrados
        </span>
        <span>•</span>
        <span>
          Aportes totais:{" "}
          <strong className="font-mono-financial text-numeric-mono-sm tabular-nums text-on-surface">
            {formatBrl(investedTotal)}
          </strong>
        </span>
        <span>•</span>
        <span>
          Valor líquido projetado:{" "}
          <strong className="font-mono-financial text-numeric-mono-sm tabular-nums text-secondary">
            {formatBrl(netProjected)}
          </strong>
        </span>
      </div>
      <div className="flex items-center gap-1">
        <MaterialIcon name="verified" size={16} className="text-secondary" />
        <span>Marcações consolidadas a partir do último valuation por posição</span>
      </div>
    </div>
  );
}

function InfoNotice() {
  return (
    <div className="mt-space-md flex items-center gap-space-md rounded bg-surface-container-low p-space-md text-on-surface-variant shadow-sm">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-surface-container-high text-primary">
        <MaterialIcon name="info" size={20} />
      </div>
      <div className="flex flex-col">
        <span className="text-label-md font-label-md font-semibold text-on-surface">
          Integridade fiscal &amp; marcação contábil
        </span>
        <p className="mt-0.5 text-body-sm font-body-sm text-on-surface-variant">
          O controle de renda fixa manual preserva a fidelidade patrimonial para ativos sem feed
          automático B3, com estimativa de IR regressivo para títulos tributáveis e saldo bruto
          informado pelo custodiante.
        </p>
      </div>
    </div>
  );
}