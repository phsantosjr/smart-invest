import { MaterialIcon } from "../../../components/MaterialIcon";
import type { OperationMode } from "../../../types/transactions";
import type { AveragePriceProjection } from "../utils/transactionPreview";

type TransactionSummaryPanelProps = {
  operationMode: OperationMode;
  totalPreview: string | null;
  totalBreakdown: string | null;
  averageProjection: AveragePriceProjection | null;
  institutionLabel: string | null;
  custodyQuantity: string | null;
};

export function TransactionSummaryPanel({
  operationMode,
  totalPreview,
  totalBreakdown,
  averageProjection,
  institutionLabel,
  custodyQuantity,
}: TransactionSummaryPanelProps) {
  const isBuy = operationMode === "BUY";
  const isIncome = operationMode === "INCOME";
  const isFixedIncome = operationMode === "FIXED_INCOME";
  const badgeLabel = isFixedIncome
    ? "RENDA FIXA"
    : isIncome
      ? "PROVENTO"
      : isBuy
        ? "COMPRA ESTIMADA"
        : "VENDA ESTIMADA";
  const badgeClass = isFixedIncome
    ? "border border-primary-fixed/25 bg-primary-container/20 text-on-primary-container"
    : isIncome
      ? "border border-secondary/25 bg-secondary-container/20 text-on-secondary-container"
      : isBuy
        ? "border border-b3-green/20 bg-b3-green-soft text-emerald-400"
        : "border border-b3-red/20 bg-b3-red/15 text-rose-400";

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-low p-6 shadow-lg"
      data-purpose="calculation-summary-card"
    >
      <div
        className="pointer-events-none absolute -top-16 -right-16 h-36 w-36 rounded-full bg-primary-container/20 blur-3xl"
        aria-hidden
      />
      <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4">
        <div className="flex items-center gap-2">
          <MaterialIcon name="calculate" size={16} className="text-primary-fixed" />
          <h3 className="text-xs font-bold tracking-wider text-on-surface-variant uppercase">
            Resumo Financeiro da Operação
          </h3>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 font-mono-financial text-[10px] font-bold ${badgeClass}`}
        >
          {badgeLabel}
        </span>
      </div>

      <div className="my-4 rounded-xl border border-outline-variant/25 bg-surface-dim/40 py-5 text-center">
        <span className="mb-1 block text-[11px] font-semibold text-on-surface-variant">
          {isFixedIncome
            ? "SALDO BRUTO MARCADO"
            : isIncome
              ? "VALOR LÍQUIDO DO PROVENTO"
              : isBuy
                ? "VALOR TOTAL DO DESEMBOLSO"
                : "VALOR LÍQUIDO ESTIMADO"}
        </span>
        <div className="font-mono-financial text-2xl font-extrabold tracking-tight text-on-surface sm:text-3xl">
          {totalPreview ?? "—"}
        </div>
        {totalBreakdown ? (
          <p className="mt-1 font-mono-financial text-[11px] text-on-surface-variant">
            {totalBreakdown}
          </p>
        ) : null}
      </div>

      {averageProjection && isBuy ? (
        <div className="space-y-2 rounded-xl border border-outline-variant/30 bg-surface-container/80 p-3 font-mono-financial text-xs">
          <div className="flex items-center justify-between text-[11px] text-on-surface-variant">
            <span>Impacto no Preço Médio (PM):</span>
            <span className="font-semibold text-primary-fixed">{averageProjection.tickerLabel}</span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <div>
              <span className="block text-[10px] text-on-surface-variant">PM Atual</span>
              <span className="font-bold text-on-surface">{averageProjection.currentAverage}</span>
              <span className="block text-[10px] text-on-surface-variant">
                {averageProjection.currentQuantity}
              </span>
            </div>
            <MaterialIcon name="arrow_forward" size={16} className="text-outline" />
            <div className="text-right">
              <span className="block text-[10px] font-bold text-primary-fixed">Novo PM Estimado</span>
              <span className="text-sm font-extrabold text-b3-green">
                {averageProjection.nextAverage}
              </span>
              <span className="block text-[10px] text-on-surface-variant">
                {averageProjection.nextQuantity}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {operationMode === "SELL" && custodyQuantity !== null ? (
        <p className="mt-3 text-xs text-on-surface-variant">
          Saldo em custódia nesta conta:{" "}
          <span className="font-mono-financial font-semibold text-on-surface">{custodyQuantity}</span>
        </p>
      ) : null}

      {institutionLabel ? (
        <p className="mt-3 text-xs text-on-surface-variant">
          Conta selecionada:{" "}
          <span className="font-medium text-on-surface">{institutionLabel}</span>
        </p>
      ) : null}

      <div className="mt-5 flex items-center gap-3 rounded-xl border border-primary-fixed/20 bg-primary-container/10 p-3">
        <MaterialIcon name="verified_user" size={20} className="shrink-0 text-primary-fixed" />
        <p className="text-[11px] leading-tight text-on-surface-variant">
          Lançamento manual sujeito à conciliação com os extratos da corretora e da B3 quando
          disponível.
        </p>
      </div>
    </div>
  );
}