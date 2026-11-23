import { MaterialIcon } from "../../../components/MaterialIcon";
import { TextField } from "../../../components/TextField";

type FixedIncomeValuationFormFieldsProps = {
  valuationDate: string;
  onValuationDateChange: (value: string) => void;
  appliedValue: string;
  onAppliedValueChange: (value: string) => void;
  appliedValueLocked: boolean;
  currentValue: string;
  onCurrentValueChange: (value: string) => void;
  submitting: boolean;
  onSaveAndNew: () => void;
  onCancel: () => void;
};

const INPUT_CLASS =
  "rounded-xl border-outline-variant/40 bg-surface-container-low text-sm focus:border-primary-fixed focus:ring-primary-fixed/40";

export function FixedIncomeValuationFormFields({
  valuationDate,
  onValuationDateChange,
  appliedValue,
  onAppliedValueChange,
  appliedValueLocked,
  currentValue,
  onCurrentValueChange,
  submitting,
  onSaveAndNew,
  onCancel,
}: FixedIncomeValuationFormFieldsProps) {
  const canSubmit =
    currentValue.trim() && (appliedValueLocked || appliedValue.trim());

  return (
    <div className="space-y-4 border-t border-outline-variant/30 pt-4">
      <p className="text-xs text-on-surface-variant">
        Informe o valor aplicado (capital inicial) e o saldo bruto atual do título. A marcação
        atualiza o patrimônio e o ganho/perda na carteira.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          id="valuation-date"
          label="Data da marcação"
          type="date"
          value={valuationDate}
          onChange={(e) => onValuationDateChange(e.target.value)}
          className={INPUT_CLASS}
          required
        />
        <TextField
          id="applied-value"
          label="Valor aplicado (R$)"
          inputMode="decimal"
          value={appliedValue}
          onChange={(e) => onAppliedValueChange(e.target.value)}
          className={`${INPUT_CLASS} font-mono-financial`}
          placeholder="0,00"
          required={!appliedValueLocked}
          readOnly={appliedValueLocked}
          title={
            appliedValueLocked
              ? "O valor aplicado é mantido das marcações anteriores desta posição."
              : undefined
          }
        />
        <TextField
          id="current-value"
          label="Saldo bruto (R$)"
          inputMode="decimal"
          value={currentValue}
          onChange={(e) => onCurrentValueChange(e.target.value)}
          className={`${INPUT_CLASS} font-mono-financial font-bold`}
          placeholder="0,00"
          required
        />
      </div>

      <div className="flex flex-col items-center gap-3 border-t border-outline-variant/30 pt-5 sm:flex-row">
        <button
          type="submit"
          disabled={submitting || !canSubmit}
          className="flex w-full flex-1 items-center justify-center gap-2 rounded-xl border border-primary-fixed/30 bg-primary-container py-3 text-xs font-bold tracking-wide text-on-primary-container shadow-lg shadow-primary-container/20 transition-transform active:scale-[0.99] disabled:opacity-50 sm:w-auto"
        >
          <MaterialIcon name="verified_user" size={16} />
          {submitting ? "Salvando…" : "Confirmar marcação"}
        </button>
        <button
          type="button"
          disabled={submitting || !canSubmit}
          onClick={onSaveAndNew}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-outline-variant/40 bg-surface-container-low px-4 py-3 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-50 sm:w-auto"
        >
          <MaterialIcon name="library_add" size={16} className="text-outline" />
          Salvar &amp; novo
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="w-full text-xs font-semibold text-on-surface-variant hover:text-on-surface sm:w-auto"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}