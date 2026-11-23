import { Link } from "react-router-dom";

import { MaterialIcon } from "../../../components/MaterialIcon";
import type { TransactionListItem } from "../../../types/transactions";
import { formatBrl } from "../../../utils/money";

type RecentTransactionsSidebarProps = {
  items: TransactionListItem[];
  loading: boolean;
};

function formatOperationLabel(type: string, qty: string): string {
  const label = type === "BUY" ? "Compra" : type === "SELL" ? "Venda" : type;
  return `${label} ${qty} un.`;
}

export function RecentTransactionsSidebar({ items, loading }: RecentTransactionsSidebarProps) {
  return (
    <section
      className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-5"
      data-purpose="recent-entries-section"
    >
      <div className="mb-3 flex items-center justify-between">
        <h4 className="flex items-center gap-2 text-xs font-bold tracking-wider text-on-surface-variant uppercase">
          <MaterialIcon name="history" size={14} className="text-primary-fixed" />
          Últimos Lançamentos
        </h4>
        <span className="font-mono-financial text-[10px] text-on-surface-variant">Recentes</span>
      </div>

      {loading ? (
        <p className="text-xs text-on-surface-variant">Carregando…</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-on-surface-variant">Nenhum lançamento registrado ainda.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const isBuy = item.transaction_type === "BUY";
            return (
              <li
                key={item.id}
                className="flex items-center justify-between rounded-xl border border-outline-variant/25 bg-surface-dim/70 p-2.5 text-xs transition-colors hover:bg-surface-container"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`h-2 w-2 rounded-full ${isBuy ? "bg-b3-green" : "bg-b3-blue"}`}
                    aria-hidden
                  />
                  <div>
                    <span className="font-mono-financial font-bold text-on-surface">
                      {item.asset.ticker ?? item.asset.name}
                    </span>
                    <span className="ml-1.5 text-[11px] text-on-surface-variant">
                      {formatOperationLabel(item.transaction_type, item.quantity)}
                    </span>
                  </div>
                </div>
                <div className="text-right font-mono-financial">
                  <div className="font-semibold text-on-surface">{formatBrl(item.total_amount)}</div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-3 pt-2 text-center">
        <Link
          to="/transactions"
          className="text-[11px] font-medium text-primary-fixed transition-colors hover:text-primary-container"
        >
          Ver extrato completo de lançamentos →
        </Link>
      </div>
    </section>
  );
}