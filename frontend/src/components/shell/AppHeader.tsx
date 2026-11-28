import { useAppSelector } from "../../app/hooks";
import { HIDDEN_MONEY_LABEL, HIDDEN_PERCENT_LABEL } from "../../utils/financialPrivacy";
import { MaterialIcon } from "../MaterialIcon";
import { ValuesVisibilityToggle } from "../ValuesVisibilityToggle";

type AppHeaderProps = {
  breadcrumb: string;
  sidebarCollapsed: boolean;
};

export function AppHeader({ breadcrumb, sidebarCollapsed }: AppHeaderProps) {
  const currentUser = useAppSelector((state) => state.auth.currentUser);
  const valuesHidden = useAppSelector((state) => state.ui.valuesHidden);
  const ownerLabel = currentUser?.is_household_owner ? "Titular" : "Membro";

  return (
    <header
      className={`fixed top-0 z-40 flex h-16 items-center justify-between bg-surface/90 px-space-lg backdrop-blur-xl ${
        sidebarCollapsed ? "left-16 right-0" : "left-64 right-0"
      }`}
    >
      <div className="flex items-center gap-space-lg">
        <div className="flex items-center gap-space-sm text-xs font-semibold">
          <span className="text-on-surface-variant">Portfólio</span>
          <span className="text-on-surface-variant">/</span>
          <span className="font-semibold text-on-surface">{breadcrumb}</span>
        </div>
        <div className="hidden items-center gap-space-sm text-xs font-medium tabular-nums xl:flex">
          <MacroChip
            label="IPCA"
            value={valuesHidden ? HIDDEN_PERCENT_LABEL : "+6,25%"}
            valueClassName="text-secondary"
          />
          <MacroChip
            label="CDI"
            value={valuesHidden ? HIDDEN_PERCENT_LABEL : "10,40%"}
            valueClassName="text-secondary"
          />
          <MacroChip
            label="USD"
            value={valuesHidden ? HIDDEN_MONEY_LABEL : "R$ 5,72"}
            valueClassName="text-tertiary"
          />
        </div>
      </div>

      <div className="flex items-center gap-space-md">
        <ValuesVisibilityToggle />
        <button
          type="button"
          aria-label="Notificações"
          className="relative rounded p-space-sm text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
        >
          <MaterialIcon name="notifications" size={20} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-secondary" />
        </button>
        <div className="flex items-center gap-space-sm border-l border-outline-variant/30 pl-space-sm">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
            <MaterialIcon name="person" size={18} className="text-on-primary" />
          </div>
          <div className="hidden text-left sm:block">
            <p className="text-xs font-semibold leading-tight text-on-surface">
              {currentUser?.name ?? "—"}
            </p>
            <p className="text-[11px] font-semibold leading-tight text-secondary">{ownerLabel}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

function MacroChip({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName: string;
}) {
  return (
    <div className="flex items-center gap-space-xs rounded bg-surface-container px-space-sm py-0.5">
      <span className="text-on-surface-variant">{label}</span>
      <span className={`font-medium ${valueClassName}`}>{value}</span>
    </div>
  );
}