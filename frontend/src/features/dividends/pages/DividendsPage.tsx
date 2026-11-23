import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { MaterialIcon } from "../../../components/MaterialIcon";
import { getErrorMessage } from "../../../services/api";
import { fetchAssets } from "../../../services/assetsApi";
import {
  fetchIncomeMonthlyReport,
  fetchIncomeSummaryByAsset,
  fetchReinvestmentAnalysis,
} from "../../../services/incomeEventsApi";
import type { Asset } from "../../../types/assets";
import type {
  FiiReinvestmentItem,
  IncomeMonthlyRow,
  ReinvestmentAnalysisResponse,
} from "../../../types/incomeReports";
import type { IncomeAssetSummaryRow } from "../../../types/incomeSummary";
import { formatBrl } from "../../../utils/money";
import { assetTypeLabel } from "../../transactions/utils/assetDisplay";

type DividendsTab = "consolidated" | "monthly" | "reinvestment";
type ConsolidatedAssetGroup = "fii" | "stock";

const CONSOLIDATED_GROUP_ASSET_TYPE: Record<ConsolidatedAssetGroup, string> = {
  fii: "FII",
  stock: "STOCK",
};

function currentYearMonth(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}

function formatMonthLabel(value: string): string {
  const [year, month] = value.split("-");
  return `${month}/${year}`;
}

export function DividendsPage() {
  const [tab, setTab] = useState<DividendsTab>("consolidated");

  return (
    <div className="flex w-full flex-col gap-space-md pb-space-xl">
      <header className="flex flex-col gap-space-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-headline text-2xl font-semibold text-on-surface">Dividendos</h1>
          <p className="mt-0.5 text-xs text-on-surface-variant">
            Proventos recebidos, histórico mensal e controle de reinvestimento.
          </p>
        </div>
        <Link
          to="/transactions/new"
          className="inline-flex items-center gap-space-xs rounded-lg bg-secondary px-space-md py-2 text-xs font-semibold text-on-secondary shadow-sm hover:opacity-90"
        >
          <MaterialIcon name="paid" size={18} />
          Lançar provento
        </Link>
      </header>

      <nav
        className="flex flex-wrap gap-1 rounded-lg border border-outline-variant/25 bg-surface-container-low p-1"
        aria-label="Abas de proventos"
      >
        <TabButton active={tab === "consolidated"} onClick={() => setTab("consolidated")}>
          Consolidado por ativo
        </TabButton>
        <TabButton active={tab === "monthly"} onClick={() => setTab("monthly")}>
          Histórico mês a mês
        </TabButton>
        <TabButton active={tab === "reinvestment"} onClick={() => setTab("reinvestment")}>
          Reinvestimento
        </TabButton>
      </nav>

      {tab === "consolidated" ? <ConsolidatedTab /> : null}
      {tab === "monthly" ? <MonthlyTab /> : null}
      {tab === "reinvestment" ? <ReinvestmentTab /> : null}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-md bg-primary-container px-3 py-2 text-xs font-semibold text-on-primary shadow-sm"
          : "rounded-md px-3 py-2 text-xs font-medium text-on-surface-variant hover:bg-surface-container-high"
      }
    >
      {children}
    </button>
  );
}

function ConsolidatedTab() {
  const [group, setGroup] = useState<ConsolidatedAssetGroup>("fii");
  const [rows, setRows] = useState<IncomeAssetSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const summary = await fetchIncomeSummaryByAsset({ scope: "self" });
        if (active) {
          setRows(summary.rows);
        }
      } catch (loadError) {
        if (active) {
          setError(getErrorMessage(loadError));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => row.asset_type === CONSOLIDATED_GROUP_ASSET_TYPE[group]),
    [group, rows],
  );

  const groupTotal = useMemo(
    () => filteredRows.reduce((sum, row) => sum + Number(row.total_net_amount), 0),
    [filteredRows],
  );

  const emptyMessage =
    group === "fii"
      ? "Nenhum provento de FII registrado ainda."
      : "Nenhum provento de ações registrado ainda.";

  return (
    <section className="rounded-lg bg-surface-container-low p-space-md shadow-sm">
      <nav
        className="mb-space-md flex flex-wrap gap-1 rounded-lg border border-outline-variant/20 bg-surface-container p-1"
        aria-label="Grupos do consolidado por ativo"
      >
        <TabButton active={group === "fii"} onClick={() => setGroup("fii")}>
          Dividendos de FII
        </TabButton>
        <TabButton active={group === "stock"} onClick={() => setGroup("stock")}>
          Dividendos de Ações
        </TabButton>
      </nav>

      <SummaryStrip
        grandTotal={String(groupTotal)}
        loading={loading}
        count={filteredRows.length}
      />

      {error ? (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : loading ? (
        <p className="text-sm text-on-surface-variant">Carregando…</p>
      ) : filteredRows.length === 0 ? (
        <p className="text-sm text-on-surface-variant">
          {rows.length === 0 ? (
            <>
              Nenhum provento registrado ainda.{" "}
              <Link to="/transactions/new" className="font-medium text-secondary hover:underline">
                Registrar o primeiro
              </Link>
              .
            </>
          ) : (
            <>
              {emptyMessage}{" "}
              <Link to="/transactions/new" className="font-medium text-secondary hover:underline">
                Lançar provento
              </Link>
              .
            </>
          )}
        </p>
      ) : (
        <DividendsByAssetTable rows={filteredRows} showAssetType={false} />
      )}
    </section>
  );
}

function MonthlyTab() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [month, setMonth] = useState("");
  const [assetId, setAssetId] = useState("");
  const [rows, setRows] = useState<IncomeMonthlyRow[]>([]);
  const [totalNet, setTotalNet] = useState("0");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const report = await fetchIncomeMonthlyReport({
        scope: "self",
        month: month || undefined,
        asset_id: assetId || undefined,
      });
      setRows(report.items);
      setTotalNet(report.total_net_amount);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [assetId, month]);

  useEffect(() => {
    let active = true;
    async function loadAssets() {
      try {
        const catalog = await fetchAssets();
        if (active) {
          setAssets(catalog);
        }
      } catch {
        if (active) {
          setAssets([]);
        }
      }
    }
    void loadAssets();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  return (
    <section className="rounded-lg bg-surface-container-low p-space-md shadow-sm">
      <div className="mb-space-md flex flex-wrap items-end gap-space-md">
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-semibold text-on-surface-variant">Mês / ano</span>
          <input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="rounded-lg border border-outline-variant/40 bg-surface px-3 py-2 text-sm text-on-surface focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
          />
        </label>
        <label className="flex min-w-[12rem] flex-col gap-1 text-xs">
          <span className="font-semibold text-on-surface-variant">Ativo</span>
          <select
            value={assetId}
            onChange={(event) => setAssetId(event.target.value)}
            className="rounded-lg border border-outline-variant/40 bg-surface px-3 py-2 text-sm text-on-surface focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
          >
            <option value="">Todos</option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.ticker ?? asset.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mb-space-md flex flex-wrap items-center gap-space-md rounded-xl border border-outline-variant/25 bg-surface-dim/40 px-space-md py-space-sm">
        <SummaryKpi label="Total líquido (filtro)" value={loading ? "—" : formatBrl(totalNet)} />
      </div>

      {error ? (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : loading ? (
        <p className="text-sm text-on-surface-variant">Carregando…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-on-surface-variant">Nenhum provento para o filtro selecionado.</p>
      ) : (
        <MonthlyIncomeTable rows={rows} />
      )}
    </section>
  );
}

function MonthlyIncomeTable({ rows }: { rows: IncomeMonthlyRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[360px] text-left text-xs">
        <thead>
          <tr className="border-b border-outline-variant/30 text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
            <th className="px-2 py-2">Mês / ano</th>
            <th className="px-2 py-2 text-right">Valor líquido</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/10 text-on-surface">
          {rows.map((row) => (
            <tr key={row.month} className="hover:bg-surface-container/50">
              <td className="px-2 py-2.5 tabular-nums">{formatMonthLabel(row.month)}</td>
              <td className="px-2 py-2.5 text-right font-semibold tabular-nums text-secondary">
                {formatBrl(row.total_net_amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReinvestmentTab() {
  const [targetMonth, setTargetMonth] = useState(currentYearMonth());
  const [year, setYear] = useState(() => String(new Date().getFullYear()));
  const [data, setData] = useState<ReinvestmentAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const analysis = await fetchReinvestmentAnalysis({
          scope: "self",
          target_month: targetMonth,
          year: Number(year),
        });
        if (active) {
          setData(analysis);
        }
      } catch (loadError) {
        if (active) {
          setError(getErrorMessage(loadError));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [targetMonth, year]);

  const stocks = data?.stocks_smart_invest;
  const fii = data?.fii_reinvestment;

  return (
    <div className="flex flex-col gap-space-md">
      {error ? (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      ) : null}

      <section className="rounded-lg bg-surface-container-low p-space-md shadow-sm">
        <header className="mb-space-md flex flex-col gap-space-sm sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-on-surface">FIIs — ciclo mensal por ativo</h2>
            <p className="text-xs text-on-surface-variant">
              Proventos recebidos e compras no mesmo mês de referência (
              {fii ? formatMonthLabel(fii.purchase_month) : "mês selecionado"}).
            </p>
          </div>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold text-on-surface-variant">Mês de referência</span>
            <input
              type="month"
              value={targetMonth}
              onChange={(event) => setTargetMonth(event.target.value)}
              className="rounded-lg border border-outline-variant/40 bg-surface px-3 py-2 text-sm text-on-surface focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
            />
          </label>
        </header>

        {loading ? (
          <p className="text-sm text-on-surface-variant">Carregando…</p>
        ) : fii ? (
          <>
            <div className="mb-space-md flex flex-wrap gap-space-md rounded-xl border border-outline-variant/25 bg-surface-dim/40 px-space-md py-space-sm">
              <SummaryKpi
                label={`Proventos recebidos (${formatMonthLabel(fii.income_month)})`}
                value={formatBrl(fii.total_income_received)}
              />
              <SummaryKpi
                label={`Comprado em FIIs (${formatMonthLabel(fii.purchase_month)})`}
                value={formatBrl(fii.total_purchased)}
              />
              <SummaryKpi
                label="Saldo a reinvestir"
                value={formatBrl(fii.missing_amount)}
                highlight={fii.needs_reinvestment}
              />
            </div>
            {fii.needs_reinvestment ? (
              <div className="mb-space-md rounded-lg border border-secondary/30 bg-secondary-container/15 px-space-md py-space-sm text-sm text-on-surface">
                Reinvestimento pendente: compre {formatBrl(fii.missing_amount)} em FIIs para cobrir os
                proventos de {formatMonthLabel(fii.income_month)}.
              </div>
            ) : null}
            {fii.items.length === 0 ? (
              <p className="text-sm text-on-surface-variant">
                Nenhum FII com proventos neste mês para esta referência.
              </p>
            ) : (
              <FiiReinvestmentTable items={fii.items} />
            )}
          </>
        ) : null}
      </section>

      <section className="rounded-lg bg-surface-container-low p-space-md shadow-sm">
        <header className="mb-space-md flex flex-col gap-space-sm sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-on-surface">Smart Invest — ações (ciclo anual)</h2>
            <p className="text-xs text-on-surface-variant">
              Dividendos + JCP de ações vs compras na classe no ano.
            </p>
          </div>
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold text-on-surface-variant">Ano</span>
            <input
              type="number"
              min={2000}
              max={2100}
              value={year}
              onChange={(event) => setYear(event.target.value)}
              className="w-28 rounded-lg border border-outline-variant/40 bg-surface px-3 py-2 text-sm text-on-surface focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary"
            />
          </label>
        </header>

        {loading ? (
          <p className="text-sm text-on-surface-variant">Carregando…</p>
        ) : stocks ? (
          <>
            <div className="mb-space-md flex flex-wrap gap-space-md rounded-xl border border-outline-variant/25 bg-surface-dim/40 px-space-md py-space-sm">
              <SummaryKpi
                label="Dividendos + JCP (ano)"
                value={formatBrl(stocks.total_income_received)}
              />
              <SummaryKpi label="Comprado em ações (ano)" value={formatBrl(stocks.total_purchased)} />
              <SummaryKpi
                label="Saldo a reinvestir"
                value={formatBrl(stocks.missing_amount)}
                highlight={stocks.needs_reinvestment}
              />
            </div>
            {stocks.needs_reinvestment ? (
              <div className="rounded-lg border border-secondary/30 bg-secondary-container/15 px-space-md py-space-sm text-sm text-on-surface">
                Reinvestimento pendente: compre {formatBrl(stocks.missing_amount)} em ações para cobrir
                os proventos de {stocks.year}.
              </div>
            ) : null}
          </>
        ) : null}
      </section>
    </div>
  );
}

function FiiReinvestmentTable({ items }: { items: FiiReinvestmentItem[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-xs">
        <thead>
          <tr className="border-b border-outline-variant/30 text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
            <th className="px-2 py-2">FII</th>
            <th className="px-2 py-2 text-right">Recebido no mês</th>
            <th className="px-2 py-2 text-right">Comprado no mês</th>
            <th className="px-2 py-2 text-right">Falta comprar (R$)</th>
            <th className="px-2 py-2">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/10 text-on-surface">
          {items.map((row) => {
            const pending = Number(row.missing_amount) > 0;
            return (
              <tr
                key={row.asset_id}
                className={
                  pending
                    ? "hover:bg-surface-container/50"
                    : "bg-b3-green-soft hover:bg-b3-green-soft/80"
                }
              >
                <td className="px-2 py-2.5 font-bold">{row.ticker ?? "—"}</td>
                <td className="px-2 py-2.5 text-right tabular-nums">{formatBrl(row.income_received)}</td>
                <td className="px-2 py-2.5 text-right tabular-nums">{formatBrl(row.amount_purchased)}</td>
                <td className="px-2 py-2.5 text-right tabular-nums">
                  <span
                    className={
                      pending
                        ? "rounded px-1.5 py-0.5 font-semibold text-on-surface bg-[#F9E2AF]"
                        : "font-semibold text-on-surface-variant"
                    }
                  >
                    {formatBrl(row.missing_amount)}
                  </span>
                </td>
                <td className="px-2 py-2.5">
                  {pending ? (
                    <span className="font-semibold text-secondary">Pendente</span>
                  ) : (
                    <span className="font-semibold text-b3-green">Concluído</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SummaryStrip({
  grandTotal,
  loading,
  count,
}: {
  grandTotal: string;
  loading: boolean;
  count: number;
}) {
  return (
    <div className="mb-space-md flex flex-wrap items-center gap-space-md rounded-xl border border-outline-variant/25 bg-surface-dim/40 px-space-md py-space-sm">
      <SummaryKpi label="Total líquido" value={loading ? "—" : formatBrl(grandTotal)} />
      <SummaryKpi label="Ativos com provento" value={loading ? "—" : String(count)} />
    </div>
  );
}

function SummaryKpi({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <span className="block text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
        {label}
      </span>
      <span
        className={`font-mono-financial text-lg font-bold tabular-nums ${
          highlight ? "text-secondary" : "text-on-surface"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function DividendsByAssetTable({
  rows,
  showAssetType = true,
}: {
  rows: IncomeAssetSummaryRow[];
  showAssetType?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-xs">
        <thead>
          <tr className="border-b border-outline-variant/30 text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
            <th className="px-2 py-2">Ativo</th>
            {showAssetType ? <th className="px-2 py-2">Tipo</th> : null}
            <th className="px-2 py-2 text-right">Lançamentos</th>
            <th className="px-2 py-2 text-right">Total líquido recebido</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/10 text-on-surface">
          {rows.map((row) => (
            <tr key={row.asset_id} className="hover:bg-surface-container/50">
              <td className="px-2 py-2.5">
                <span className="font-bold">{row.ticker ?? "—"}</span>
                <span className="ml-2 text-on-surface-variant">{row.name}</span>
              </td>
              {showAssetType ? (
                <td className="px-2 py-2.5 text-on-surface-variant">
                  {assetTypeLabel(row.asset_type as never)}
                </td>
              ) : null}
              <td className="px-2 py-2.5 text-right tabular-nums">{row.event_count}</td>
              <td className="px-2 py-2.5 text-right font-semibold tabular-nums text-secondary">
                {formatBrl(row.total_net_amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}