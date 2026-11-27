import { useCallback, useState, type ReactNode } from "react";

import { MaterialIcon } from "../../../components/MaterialIcon";
import { getErrorMessage } from "../../../services/api";
import { runProjection } from "../../../services/projectionApi";
import type {
  AssetScope,
  ProjectionGroupBy,
  ProjectionRunResponse,
} from "../../../types/projection";
import { formatBrl } from "../../../utils/money";
import { ProjectionBarChart } from "../components/ProjectionBarChart";

type ResultTab = "table" | "chart";

const SCOPE_OPTIONS: { value: AssetScope; label: string; disabled?: boolean }[] = [
  { value: "ALL", label: "Toda a carteira (só FIIs por ora)" },
  { value: "FII", label: "Fundos imobiliários (FII)" },
  { value: "STOCK", label: "Ações", disabled: true },
  { value: "FIXED_INCOME", label: "Renda fixa", disabled: true },
  { value: "TREASURY", label: "Tesouro", disabled: true },
];

function formatPercent(value: string): string {
  const n = Number.parseFloat(value);
  return `${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

export function ProjectionPage() {
  const [assetScope, setAssetScope] = useState<AssetScope>("FII");
  const [monthlyContribution, setMonthlyContribution] = useState("500");
  const [horizonYears, setHorizonYears] = useState(5);
  const [groupBy, setGroupBy] = useState<ProjectionGroupBy>("month");
  const [byDividendWeight, setByDividendWeight] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProjectionRunResponse | null>(null);
  const [resultTab, setResultTab] = useState<ResultTab>("table");

  const onSubmit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const contribution = monthlyContribution.replace(",", ".").trim();
      const data = await runProjection({
        asset_scope: assetScope,
        monthly_contribution: contribution,
        horizon_years: horizonYears,
        group_by: groupBy,
        allocate_contribution_by_last_dividend: byDividendWeight,
      });
      setResult(data);
      setResultTab("table");
    } catch (err) {
      setError(getErrorMessage(err));
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [assetScope, byDividendWeight, groupBy, horizonYears, monthlyContribution]);

  return (
    <div className="flex w-full flex-col gap-space-md pb-space-xl">
      <header>
        <h1 className="font-headline text-2xl font-semibold text-on-surface">Projeção</h1>
        <p className="mt-0.5 text-xs text-on-surface-variant">
          Simule a evolução da carteira com aportes e reinvestimento de proventos (FII).
        </p>
      </header>

      <section className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-space-md">
        <h2 className="text-sm font-semibold text-on-surface">Parâmetros</h2>
        <div className="mt-space-md grid gap-space-md sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-on-surface-variant">Escopo</span>
            <select
              className="rounded-lg border border-outline-variant/40 bg-surface px-3 py-2 text-sm"
              value={assetScope}
              onChange={(e) => setAssetScope(e.target.value as AssetScope)}
            >
              {SCOPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-on-surface-variant">Aporte mensal (R$)</span>
            <input
              type="text"
              inputMode="decimal"
              className="rounded-lg border border-outline-variant/40 bg-surface px-3 py-2 text-sm tabular-nums"
              value={monthlyContribution}
              onChange={(e) => setMonthlyContribution(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-on-surface-variant">Horizonte (anos, máx. 20)</span>
            <input
              type="number"
              min={1}
              max={20}
              className="rounded-lg border border-outline-variant/40 bg-surface px-3 py-2 text-sm tabular-nums"
              value={horizonYears}
              onChange={(e) => setHorizonYears(Number.parseInt(e.target.value, 10) || 1)}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-on-surface-variant">Agrupar retorno</span>
            <select
              className="rounded-lg border border-outline-variant/40 bg-surface px-3 py-2 text-sm"
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as ProjectionGroupBy)}
            >
              <option value="month">Mês a mês</option>
              <option value="year">Ano a ano</option>
            </select>
          </label>

          <label className="flex items-center gap-2 text-xs sm:col-span-2">
            <input
              type="checkbox"
              checked={byDividendWeight}
              onChange={(e) => setByDividendWeight(e.target.checked)}
              className="size-4 rounded border-outline-variant"
            />
            <span>
              Distribuir aporte pelo último dividendo de cada FII (desmarcado = partes iguais)
            </span>
          </label>
        </div>

        <div className="mt-space-md flex flex-wrap items-center gap-space-sm">
          <button
            type="button"
            disabled={loading}
            onClick={() => void onSubmit()}
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-on-primary hover:opacity-90 disabled:opacity-50"
          >
            <MaterialIcon name="play_arrow" size={18} />
            {loading ? "Processando…" : "Processar"}
          </button>
          {error ? <p className="text-xs text-error">{error}</p> : null}
        </div>
      </section>

      {result ? (
        <>
          {result.notes.length > 0 ? (
            <ul className="text-xs text-on-surface-variant">
              {result.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          ) : null}

          <div className="grid gap-space-md md:grid-cols-2">
            <SummaryCard
              title="Situação atual"
              patrimony={result.summary.initial_patrimony}
              subtitle="Patrimônio em FII (cota mais recente × quantidade)"
            />
            <SummaryCard
              title={`Ao final (${result.horizon_years} anos)`}
              patrimony={result.summary.final_patrimony}
              subtitle={`Ganho ${formatPercent(result.summary.gain_percent)} · Proventos ${formatBrl(Number.parseFloat(result.summary.total_dividends))}`}
              highlight
            />
          </div>

          <nav className="flex gap-1 rounded-lg border border-outline-variant/25 bg-surface-container-low p-1">
            <TabBtn active={resultTab === "table"} onClick={() => setResultTab("table")}>
              Tabela
            </TabBtn>
            <TabBtn active={resultTab === "chart"} onClick={() => setResultTab("chart")}>
              Gráfico
            </TabBtn>
          </nav>

          {resultTab === "table" ? (
            <div className="overflow-x-auto rounded-xl border border-outline-variant/25">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead className="bg-surface-container-high text-on-surface-variant">
                  <tr>
                    <th className="px-3 py-2 font-medium">Período</th>
                    <th className="px-3 py-2 font-medium text-right">Total acumulado</th>
                    <th className="px-3 py-2 font-medium text-right">Proventos</th>
                    <th className="px-3 py-2 font-medium text-right">Aportes</th>
                    <th className="px-3 py-2 font-medium text-right">Proventos acum.</th>
                    <th className="px-3 py-2 font-medium text-right">% ganho</th>
                  </tr>
                </thead>
                <tbody>
                  {result.periods.map((row) => (
                    <tr
                      key={row.period_label}
                      className="border-t border-outline-variant/15 tabular-nums"
                    >
                      <td className="px-3 py-2">{row.period_label}</td>
                      <td className="px-3 py-2 text-right">
                        {formatBrl(Number.parseFloat(row.portfolio_value))}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatBrl(Number.parseFloat(row.dividends_in_period))}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatBrl(Number.parseFloat(row.contributions_in_period))}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatBrl(Number.parseFloat(row.cumulative_dividends))}
                      </td>
                      <td className="px-3 py-2 text-right">{formatPercent(row.gain_percent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border border-outline-variant/25 bg-surface-container-lowest p-space-md">
              <ProjectionBarChart bars={result.chart_bars} />
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

function SummaryCard({
  title,
  patrimony,
  subtitle,
  highlight,
}: {
  title: string;
  patrimony: string;
  subtitle: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? "rounded-xl border border-secondary/40 bg-secondary-container/30 p-space-md"
          : "rounded-xl border border-outline-variant/25 bg-surface-container-low p-space-md"
      }
    >
      <p className="text-xs font-medium text-on-surface-variant">{title}</p>
      <p className="mt-1 font-headline text-2xl font-semibold tabular-nums text-on-surface">
        {formatBrl(Number.parseFloat(patrimony))}
      </p>
      <p className="mt-1 text-xs text-on-surface-variant">{subtitle}</p>
    </div>
  );
}

function TabBtn({
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
          ? "rounded-md bg-primary-container px-3 py-2 text-xs font-semibold text-on-primary"
          : "rounded-md px-3 py-2 text-xs font-medium text-on-surface-variant hover:bg-surface-container-high"
      }
    >
      {children}
    </button>
  );
}