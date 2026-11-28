import { useAppDispatch, useAppSelector } from "../app/hooks";
import { toggleValuesHidden } from "../features/ui/uiSlice";
import { MaterialIcon } from "./MaterialIcon";

export function ValuesVisibilityToggle() {
  const dispatch = useAppDispatch();
  const valuesHidden = useAppSelector((state) => state.ui.valuesHidden);

  return (
    <button
      type="button"
      onClick={() => dispatch(toggleValuesHidden())}
      aria-label={valuesHidden ? "Mostrar valores financeiros" : "Ocultar valores financeiros"}
      aria-pressed={valuesHidden}
      title={valuesHidden ? "Mostrar valores" : "Ocultar valores"}
      className="rounded p-space-sm text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
    >
      <MaterialIcon name={valuesHidden ? "visibility_off" : "visibility"} size={20} />
    </button>
  );
}