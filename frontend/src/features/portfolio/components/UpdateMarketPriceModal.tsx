import { FormEvent, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

import { TextField } from "../../../components/TextField";
import { MaterialIcon } from "../../../components/MaterialIcon";
import { createMarketPrice } from "../../../services/marketPricesApi";
import { getErrorMessage } from "../../../services/api";
import type { HoldingRow } from "../../../types/portfolio";

type UpdateMarketPriceModalProps = {
  holding: HoldingRow | null;
  onClose: () => void;
  onSaved: () => void;
};

function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function datetimeLocalToIso(value: string): string {
  const parsed = new Date(value);
  return parsed.toISOString();
}

export function UpdateMarketPriceModal({
  holding,
  onClose,
  onSaved,
}: UpdateMarketPriceModalProps) {
  const formId = useId();
  const [price, setPrice] = useState("");
  const [quotedAtLocal, setQuotedAtLocal] = useState(() => toDatetimeLocalValue(new Date()));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!holding) {
      return;
    }
    setPrice("");
    setQuotedAtLocal(toDatetimeLocalValue(new Date()));
    setError(null);
  }, [holding]);

  if (!holding) {
    return null;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!holding) {
      return;
    }
    const normalized = price.replace(",", ".").trim();
    if (!normalized || Number(normalized) <= 0) {
      setError("Informe um preço maior que zero.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await createMarketPrice({
        asset_id: holding.assetId,
        price: normalized,
        quoted_at: datetimeLocalToIso(quotedAtLocal),
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-scrim p-space-md backdrop-blur-[2px]"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${formId}-title`}
        className="w-full max-w-md rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-space-lg shadow-2xl ring-1 ring-black/5 dark:ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="mb-space-md flex items-start justify-between gap-space-sm border-b border-outline-variant/25 pb-space-md">
          <div>
            <h2 id={`${formId}-title`} className="text-base font-semibold text-on-surface">
              Atualizar Cotação
            </h2>
            <p className="text-xs text-on-surface-variant">
              {holding.ticker} · {holding.name}
            </p>
          </div>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="rounded p-1 text-on-surface-variant hover:bg-surface-container"
          >
            <MaterialIcon name="close" size={20} />
          </button>
        </header>

        <form className="space-y-space-md" onSubmit={handleSubmit}>
          <TextField
            id={`${formId}-asset`}
            label="Ativo"
            value={`${holding.ticker} — ${holding.name}`}
            readOnly
          />
          <TextField
            id={`${formId}-price`}
            label="Preço Atual (R$)"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0,00"
            required
          />
          <TextField
            id={`${formId}-quoted`}
            label="Data/Hora"
            type="datetime-local"
            value={quotedAtLocal}
            onChange={(e) => setQuotedAtLocal(e.target.value)}
            required
          />

          {error ? (
            <p role="alert" className="text-xs text-error">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-space-sm pt-space-xs">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-space-md py-2 text-xs font-semibold text-on-surface-variant hover:bg-surface-container"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-primary px-space-md py-2 text-xs font-semibold text-on-primary disabled:opacity-50"
            >
              {submitting ? "Salvando…" : "Salvar cotação"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}