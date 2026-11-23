import { Link } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import type { PortfolioScopeId } from "../../../types/portfolio";
import { MaterialIcon } from "../../../components/MaterialIcon";
import { setPortfolioScope } from "../portfolioSlice";

export function PortfolioScopeBar() {
  const dispatch = useAppDispatch();
  const scope = useAppSelector((state) => state.portfolio.scope);
  const data = useAppSelector((state) => state.portfolio.data);

  return (
    <section className="flex flex-col gap-space-md py-space-md lg:flex-row lg:items-center lg:justify-between">
      <div className="flex select-none items-center gap-space-xs overflow-x-auto rounded-lg bg-surface-container-low p-1">
        {data.scopeMembers.map((member) => {
          const isActive = scope === member.id;
          const isConsolidated = member.id === "consolidated";
          return (
            <button
              key={member.id}
              type="button"
              onClick={() => dispatch(setPortfolioScope(member.id as PortfolioScopeId))}
              className={[
                "group flex shrink-0 items-center gap-space-sm rounded px-space-md py-1.5 text-xs font-semibold transition-all",
                isActive
                  ? "bg-surface-container-high text-on-surface"
                  : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
              ].join(" ")}
            >
              {isConsolidated ? (
                <span className="h-2 w-2 rounded-full bg-secondary" />
              ) : (
                <span
                  className={[
                    "flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold",
                    member.accent === "primary"
                      ? "bg-primary-container text-on-primary-container"
                      : "bg-secondary-container text-on-secondary",
                  ].join(" ")}
                >
                  {member.initials}
                </span>
              )}
              <span>
                {member.name}
                {member.roleLabel ? ` (${member.roleLabel})` : ""}
              </span>
              <span
                className={[
                  "font-medium tabular-nums",
                  isActive ? "text-secondary" : "text-on-surface-variant",
                ].join(" ")}
              >
                {member.netWorth}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex shrink-0 items-center gap-space-sm">
        <Link
          to="/transactions"
          className="flex h-9 items-center gap-space-xs rounded bg-primary-container px-space-md text-xs font-semibold text-primary-fixed shadow-sm transition-colors hover:opacity-90"
        >
          <MaterialIcon name="add" size={18} />
          <span>Novo Lançamento</span>
        </Link>
        <Link
          to="/imports/brokerage-note"
          className="flex h-9 items-center gap-space-xs rounded bg-surface-container px-space-md text-xs font-medium text-on-surface transition-colors hover:bg-surface-container-high"
        >
          <MaterialIcon name="receipt_long" size={18} />
          <span>Importar Nota B3</span>
        </Link>
        <button
          type="button"
          aria-label="Filtros avançados"
          className="flex h-9 w-9 items-center justify-center rounded bg-surface-container text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
        >
          <MaterialIcon name="tune" size={18} />
        </button>
      </div>
    </section>
  );
}