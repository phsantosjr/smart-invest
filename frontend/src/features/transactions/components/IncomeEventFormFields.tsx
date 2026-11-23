import { MaterialIcon } from "../../../components/MaterialIcon";
import { TextField } from "../../../components/TextField";
import {
  INCOME_TYPE_LABEL,
  TAX_EXEMPT_INCOME_TYPES,
  type IncomeType,
} from "../../../types/incomeEvents";
import { allowedIncomeTypes } from "../utils/incomeTypesByAsset";

type IncomeEventFormFieldsProps = {
  assetType: string | null;
  incomeType: IncomeType;
  onIncomeTypeChange: (value: IncomeType) => void;
  paymentDate: string;
  onPaymentDateChange: (value: string) => void;
  exDate: string;
  onExDateChange: (value: string) => void;
  grossAmount: string;
  onGrossAmountChange: (value: string) => void;
  taxWithheld: string;
  onTaxWithheldChange: (value: string) => void;
  netPreview: string;
  submitting: boolean;
  onSaveAndNew: () => void;
  onCancel: () => void;
};

const INPUT_CLASS =
  "rounded-xl border-outline-variant/40 bg-surface-container-low text-sm focus:border-primary-fixed focus:ring-primary-fixed/40";

export function IncomeEventFormFields({
  assetType,
  incomeType,
  onIncomeTypeChange,
  paymentDate,
  onPaymentDateChange,
  exDate,
  onExDateChange,
  grossAmount,
  onGrossAmountChange,
  taxWithheld,
  onTaxWithheldChange,
  netPreview,
  submitting,
  onSaveAndNew,
  onCancel,
}: IncomeEventFormFieldsProps) {
  const taxExempt = TAX_EXEMPT_INCOME_TYPES.has(incomeType);
  const typeOptions = assetType ? allowedIncomeTypes(assetType) : [];

  return (
    <div className="space-y-4 border-t border-outline-variant/30 pt-4">
      <p className="text-xs text-on-surface-variant">
        Proventos não alteram quantidade em custódia nem o preço médio.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-xs font-semibold text-on-surface">Tipo de provento</span>
          <select
            value={incomeType}
            onChange={(e) => onIncomeTypeChange(e.target.value as IncomeType)}
            className="w-full cursor-pointer rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2.5 text-xs text-on-surface focus:border-primary-fixed focus:ring-2 focus:ring-primary-fixed/40"
          >
            {typeOptions.map((type) => (
              <option key={type} value={type}>
                {INCOME_TYPE_LABEL[type]}
              </option>
            ))}
          </select>
        </label>
        <TextField
          id="payment-date"
          label="Data de pagamento"
          type="date"
          value={paymentDate}
          onChange={(e) => onPaymentDateChange(e.target.value)}
          className={INPUT_CLASS}
          required
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          id="ex-date"
          label="Data com / ex (opcional)"
          type="date"
          value={exDate}
          onChange={(e) => onExDateChange(e.target.value)}
          className={INPUT_CLASS}
        />
        <div className="flex flex-col justify-end rounded-xl border border-outline-variant/25 bg-surface-dim/40 px-3 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-on-surface-variant">
            Valor líquido
          </span>
          <span className="font-mono-financial text-lg font-bold tabular-nums text-on-surface">
            {netPreview}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          id="gross-amount"
          label="Valor bruto (R$)"
          inputMode="decimal"
          value={grossAmount}
          onChange={(e) => onGrossAmountChange(e.target.value)}
          className={`${INPUT_CLASS} font-mono-financial font-bold`}
          required
        />
        <TextField
          id="tax-withheld"
          label="IR retido (R$)"
          inputMode="decimal"
          value={taxExempt ? "0" : taxWithheld}
          onChange={(e) => onTaxWithheldChange(e.target.value)}
          className={`${INPUT_CLASS} font-mono-financial`}
          disabled={taxExempt}
          required={!taxExempt}
        />
      </div>

      <div className="flex flex-col items-center gap-3 border-t border-outline-variant/30 pt-5 sm:flex-row">
        <button
          type="submit"
          disabled={submitting || !grossAmount.trim()}
          className="flex w-full flex-1 items-center justify-center gap-2 rounded-xl border border-secondary/30 bg-secondary py-3 text-xs font-bold tracking-wide text-on-secondary shadow-lg shadow-secondary/20 transition-transform active:scale-[0.99] disabled:opacity-50 sm:w-auto"
        >
          <MaterialIcon name="paid" size={16} />
          {submitting ? "Salvando…" : "Confirmar provento"}
        </button>
        <button
          type="button"
          disabled={submitting || !grossAmount.trim()}
          onClick={onSaveAndNew}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-outline-variant/40 bg-surface-container-low px-4 py-3 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-50 sm:w-auto"
        >
          <MaterialIcon name="library_add" size={16} className="text-outline" />
          Salvar &amp; novo
        </button>
        <button type="button" onClick={onCancel} className="w-full text-xs font-semibold text-on-surface-variant hover:text-on-surface sm:w-auto">
          Cancelar
        </button>
      </div>
    </div>
  );
}