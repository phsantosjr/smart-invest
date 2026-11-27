import type { MarketPriceRecord } from "../../../services/marketPricesApi";
import { formatBrl } from "../../../utils/money";
import { formatQuotedAt, sourceLabel } from "../utils/priceHistory";

type MarketPriceHistoryTableProps = {
  rows: MarketPriceRecord[];
  compact?: boolean;
};

export function MarketPriceHistoryTable({ rows, compact = false }: MarketPriceHistoryTableProps) {
  if (rows.length === 0) {
    return (
      <p className="text-xs text-on-surface-variant">
        Nenhuma captura registrada. Use a carteira para sincronizar ou lançar preço manual.
      </p>
    );
  }

  return (
    <div className={compact ? "overflow-x-auto" : "overflow-x-auto rounded-lg border border-outline-variant/30"}>
      <table
        className={[
          "w-full text-left",
          compact ? "text-[11px]" : "text-xs",
        ].join(" ")}
      >
        <thead className={compact ? "text-on-surface-variant" : "border-b border-outline-variant/30 bg-surface-container/50 text-on-surface-variant"}>
          <tr>
            <th className={compact ? "pb-1 pr-2 font-medium" : "px-space-md py-space-sm font-medium"}>
              Data
            </th>
            <th className={compact ? "pb-1 pr-2 font-medium tabular-nums" : "px-space-md py-space-sm font-medium tabular-nums"}>
              Preço
            </th>
            <th className={compact ? "pb-1 font-medium" : "px-space-md py-space-sm font-medium"}>
              Origem
            </th>
          </tr>
        </thead>
        <tbody className={compact ? "divide-y divide-outline-variant/15" : "divide-y divide-outline-variant/20"}>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className={compact ? "py-1.5 pr-2 tabular-nums" : "px-space-md py-space-sm tabular-nums"}>
                {formatQuotedAt(row.quoted_at)}
              </td>
              <td className={compact ? "py-1.5 pr-2 font-semibold tabular-nums" : "px-space-md py-space-sm font-semibold tabular-nums"}>
                {formatBrl(row.price)}
              </td>
              <td className={compact ? "py-1.5" : "px-space-md py-space-sm"}>
                {sourceLabel(row.source)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}