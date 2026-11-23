import { useEffect, useMemo, useState, type ReactNode } from "react";

import { MaterialIcon } from "../../../components/MaterialIcon";
import { getErrorMessage } from "../../../services/api";
import { createFixedIncomeValuation } from "../../../services/fixedIncomeValuationsApi";
import { formatBrl } from "../../../utils/money";
import type { FixedIncomeRow } from "../utils/mapFixedIncomeView";
import { estimateNetBalance } from "../utils/fixedIncomeDisplay";

type UpdateBalanceDrawerProps = {
  row: FixedIncomeRow | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function UpdateBalanceDrawer({
  row,
  open,
  onClose,
  onSaved,
}: UpdateBalanceDrawerProps) {
  const [balance, setBalance] = useState("");
  const [valuationDate, setValuationDate] = useState(todayIso());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!row || !open) {
      return;
    }
    setBalance(row.grossBalance > 0 ? String(row.grossBalance) : "");
    setValuationDate(todayIso());
    setError(null);
  }, [open, row]);

  const parsedBalance = useMemo(() => {
    const normalized = balance.replace(",", ".").trim();
    const numeric = Number(normalized);
    return Number.isFinite(numeric) ? numeric : NaN;
  }, [balance]);

  const netPreview = useMemo(() => {
    if (!row || !Number.isFinite(parsedBalance)) {
      return null;
    }
    return estimateNetBalance(parsedBalance, row.investedAmount, row.taxExempt);
  }, [parsedBalance, row]);

  const taxLabel = row?.taxExempt ? "Isento de IR" : "IR estimado 15% sobre o ganho";

  async function handleSave() {
    if (!row || !Number.isFinite(parsedBalance) || parsedBalance <= 0) {
      setError("Informe um saldo bruto válido.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createFixedIncomeValuation({
        brokerage_account_id: row.brokerageAccountId,
        asset_id: row.assetId,
        applied_value: row.investedAmount.toFixed(4),
        current_value: parsedBalance.toFixed(4),
        valuation_date: valuationDate,
      });
      onSaved();
      onClose();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col justify-between bg-surface-container-high shadow-2xl transition-transform duration-300 ease-in-out ${
        open && row ? "translate-x-0" : "translate-x-full"
      }`}
      aria-hidden={!open || !row}
    >
      <div className="flex flex-col">
        <DrawerHeader rowTitle={row?.title ?? ""} onClose={onClose} />
        <div className="flex flex-col gap-space-md p-space-lg">
          {error ? (
            <p role="alert" className="text-xs text-error">
              {error}
            </p>
          ) : null}
          <Field
            label="Novo saldo bruto (R$)"
            hint="Consulte a posição bruta no aplicativo do custodiante."
          >
            <div className="relative flex items-center">
              <span className="absolute left-3 text-label-md font-label-md text-on-surface-variant">
                R$
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={balance}
                onChange={(event) => setBalance(event.target.value)}
                className="h-10 w-full rounded bg-surface-container pl-10 pr-3 font-mono-financial text-sm tabular-nums text-on-surface focus:bg-surface-bright focus:outline-none"
                placeholder="0,00"
              />
            </div>
          </Field>
          <Field label="Data de referência do saldo">
            <input
              type="date"
              value={valuationDate}
              onChange={(event) => setValuationDate(event.target.value)}
              className="h-10 w-full rounded bg-surface-container px-3 text-sm text-on-surface focus:bg-surface-bright focus:outline-none"
            />
          </Field>
          <div className="flex flex-col gap-1 rounded bg-surface-container p-space-sm">
            <div className="flex items-center justify-between text-label-sm font-label-sm">
              <span className="text-on-surface-variant">Alíquota de IR aplicável:</span>
              <span className="font-semibold text-on-surface">{taxLabel}</span>
            </div>
            <div className="flex items-center justify-between text-label-sm font-label-sm">
              <span className="text-on-surface-variant">Saldo líquido estimado:</span>
              <span className="font-mono-financial font-semibold tabular-nums text-secondary">
                {netPreview != null ? formatBrl(netPreview) : "R$ —"}
              </span>
            </div>
          </div>
        </div>
      </div>
      <DrawerFooter onCancel={onClose} onSave={() => void handleSave()} submitting={submitting} />
    </div>
  );
}

function DrawerHeader({ rowTitle, onClose }: { rowTitle: string; onClose: () => void }) {
  return (
    <div className="flex h-16 items-center justify-between bg-surface-container px-space-lg">
      <div className="flex items-center gap-space-sm">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-primary-container text-primary">
          <MaterialIcon name="currency_exchange" size={18} />
        </div>
        <div>
          <h3 className="font-headline text-headline-sm leading-none text-on-surface">
            Atualizar posição
          </h3>
          <span className="text-label-sm font-label-sm text-on-surface-variant">{rowTitle}</span>
        </div>
      </div>
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="rounded p-1 text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
      >
        <MaterialIcon name="close" size={20} />
      </button>
    </div>
  );
}

function DrawerFooter({
  onCancel,
  onSave,
  submitting,
}: {
  onCancel: () => void;
  onSave: () => void;
  submitting: boolean;
}) {
  return (
    <div className="flex items-center justify-end gap-space-sm bg-surface-container p-space-lg">
      <button
        type="button"
        onClick={onCancel}
        className="rounded bg-surface-container-high px-space-md py-2 text-label-md font-label-md text-on-surface transition-colors hover:bg-surface-bright"
      >
        Cancelar
      </button>
      <button
        type="button"
        disabled={submitting}
        onClick={onSave}
        className="rounded bg-secondary-container px-space-md py-2 text-label-md font-label-md text-on-secondary transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "Salvando…" : "Salvar posição"}
      </button>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-label-sm font-label-sm uppercase tracking-wider text-on-surface-variant">
        {label}
      </label>
      {children}
      {hint ? <span className="text-label-sm font-label-sm text-on-surface-variant">{hint}</span> : null}
    </div>
  );
}