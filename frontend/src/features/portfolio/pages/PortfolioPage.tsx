import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { AllocationPieChart } from "../components/AllocationPieChart";
import { HoldingsTable } from "../components/HoldingsTable";
import { PortfolioKpiGrid } from "../components/PortfolioKpiGrid";
import { PortfolioScopeBar } from "../components/PortfolioScopeBar";
import { loadPortfolioPage } from "../portfolioSlice";

export function PortfolioPage() {
  const dispatch = useAppDispatch();
  const { data, status, error } = useAppSelector((state) => state.portfolio);
  const currentUser = useAppSelector((state) => state.auth.currentUser);
  const scope = useAppSelector((state) => state.portfolio.scope);

  useEffect(() => {
    if (currentUser) {
      void dispatch(loadPortfolioPage());
    }
  }, [currentUser, dispatch, scope]);

  const loading = status === "loading" && data.holdings.length === 0;

  return (
    <div className="flex w-full flex-col gap-space-md">
      <PortfolioScopeBar />
      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-error/30 bg-error-container/20 px-space-md py-space-sm text-sm text-error"
        >
          {error}
        </p>
      ) : null}
      {loading ? (
        <p className="text-sm text-on-surface-variant">Carregando carteira…</p>
      ) : (
        <>
          <PortfolioKpiGrid kpis={data.kpis} />
          <AllocationPieChart allocation={data.allocation} />
          {data.holdings.length === 0 ? (
            <section className="rounded-lg bg-surface-container-low p-space-lg text-sm text-on-surface-variant">
              Nenhuma posição aberta. Use{" "}
              <span className="font-medium text-on-surface">Novo Lançamento</span> para registrar
              uma compra.
            </section>
          ) : (
            <HoldingsTable
              holdings={data.holdings}
              totalCount={data.holdingsTotal}
              classCounts={data.holdingsClassCounts}
              onQuoteSaved={() => {
                void dispatch(loadPortfolioPage());
              }}
            />
          )}
        </>
      )}
    </div>
  );
}