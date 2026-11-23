import { MaterialIcon } from "../../../components/MaterialIcon";
import type { OperationMode } from "../../../types/transactions";

type TransactionOperationSelectorProps = {
  value: OperationMode;
  onChange: (value: OperationMode) => void;
};

const OPERATIONS: {
  id: OperationMode;
  label: string;
  icon: string;
}[] = [
  { id: "BUY", label: "Compra", icon: "add_circle" },
  { id: "SELL", label: "Venda", icon: "do_not_disturb_on" },
  { id: "INCOME", label: "Provento", icon: "paid" },
  { id: "FIXED_INCOME", label: "Renda Fixa", icon: "verified_user" },
];

export function TransactionOperationSelector({
  value,
  onChange,
}: TransactionOperationSelectorProps) {
  return (
    <div className="mb-6 space-y-2" data-purpose="operation-type-selector">
      <span className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
        Tipo de Operação
      </span>
      <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-outline-variant/30 bg-surface-dim/80 p-1 sm:grid-cols-4">
        {OPERATIONS.map((operation) => {
          const active = operation.id === value;
          const isBuy = operation.id === "BUY" && active;
          const isSell = operation.id === "SELL" && active;
          const isIncome = operation.id === "INCOME" && active;
          const isFixedIncome = operation.id === "FIXED_INCOME" && active;

          return (
            <button
              key={operation.id}
              type="button"
              onClick={() => onChange(operation.id)}
              className={[
                "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-all",
                active
                  ? isBuy
                    ? "border border-b3-green/40 bg-b3-green-soft text-emerald-300 shadow-sm"
                    : isSell
                      ? "border border-b3-red/40 bg-b3-red/15 text-rose-300 shadow-sm"
                      : isIncome
                        ? "border border-secondary/40 bg-secondary-container/30 text-on-secondary-container shadow-sm"
                        : isFixedIncome
                          ? "border border-primary-fixed/40 bg-primary-container/25 text-on-primary-container shadow-sm"
                          : "border border-primary-fixed/40 bg-primary-container/25 text-on-primary-container"
                  : "font-medium text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
              ].join(" ")}
            >
              <MaterialIcon
                name={operation.icon}
                size={14}
                className={
                  isBuy
                    ? "text-b3-green"
                    : isSell
                      ? "text-b3-red"
                      : isIncome
                        ? "text-secondary"
                        : isFixedIncome
                          ? "text-primary-fixed"
                          : "text-on-surface-variant"
                }
              />
              {operation.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}