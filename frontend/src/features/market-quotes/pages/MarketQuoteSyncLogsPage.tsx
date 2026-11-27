import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useAppSelector } from "../../../app/hooks";
import { MaterialIcon } from "../../../components/MaterialIcon";
import { getErrorMessage } from "../../../services/api";
import {
  fetchMarketQuoteSyncRuns,
  type MarketQuoteSyncRun,
} from "../../../services/marketQuoteSyncApi";

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

function triggerLabel(trigger: MarketQuoteSyncRun["trigger"]): string {
  return trigger === "SCHEDULED" ? "Agendada" : "Manual";
}

export function MarketQuoteSyncLogsPage() {
  const isSuperuser = useAppSelector((state) => state.auth.currentUser?.is_superuser);
  const [runs, setRuns] = useState<MarketQuoteSyncRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMarketQuoteSyncRuns();
      setRuns(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex w-full flex-col gap-space-md pb-space-xl">
      <header className="flex flex-col gap-space-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-headline text-2xl font-semibold text-on-surface">
            Logs de cotações
          </h1>
          <p className="mt-0.5 text-xs text-on-surface-variant">
            Histórico das capturas de preço de mercado (manual e agendada).
            {isSuperuser ? " Como operador, você vê todas as execuções." : null}
          </p>
        </div>
        <Link
          to="/portfolio"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <MaterialIcon name="arrow_back" className="text-base" />
          Voltar à carteira
        </Link>
      </header>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-error/30 bg-error-container/20 px-space-md py-space-sm text-sm text-error"
        >
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-on-surface-variant">Carregando logs…</p>
      ) : runs.length === 0 ? (
        <section className="rounded-lg bg-surface-container-low p-space-lg text-sm text-on-surface-variant">
          Nenhuma execução registrada ainda. Use &quot;Atualizar cotações&quot; na carteira.
        </section>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-outline-variant/40 bg-surface-container-low shadow-sm">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-outline-variant/30 text-xs uppercase tracking-wide text-on-surface-variant">
              <tr>
                <th className="px-space-md py-space-sm font-medium">Início</th>
                <th className="px-space-md py-space-sm font-medium">Fim</th>
                <th className="px-space-md py-space-sm font-medium">Gatilho</th>
                <th className="px-space-md py-space-sm font-medium">Status</th>
                <th className="px-space-md py-space-sm font-medium">Provedor</th>
                <th className="px-space-md py-space-sm font-medium tabular-nums">Atualizados</th>
                <th className="px-space-md py-space-sm font-medium">Falhas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {runs.map((run) => (
                <tr key={run.id} className="text-on-surface">
                  <td className="px-space-md py-space-sm tabular-nums">{formatWhen(run.started_at)}</td>
                  <td className="px-space-md py-space-sm tabular-nums">{formatWhen(run.finished_at)}</td>
                  <td className="px-space-md py-space-sm">{triggerLabel(run.trigger)}</td>
                  <td className="px-space-md py-space-sm">{run.status}</td>
                  <td className="px-space-md py-space-sm">
                    {run.providers_used ?? run.primary_provider}
                  </td>
                  <td className="px-space-md py-space-sm tabular-nums">{run.updated_count}</td>
                  <td className="px-space-md py-space-sm">
                    {(run.failed_tickers ?? []).length > 0 ? (
                      <span className="text-error" title={(run.failed_tickers ?? []).join(", ")}>
                        {(run.failed_tickers ?? []).join(", ")}
                      </span>
                    ) : (
                      <span className="text-on-surface-variant">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}