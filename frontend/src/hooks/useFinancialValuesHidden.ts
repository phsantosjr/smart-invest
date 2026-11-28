import { useAppSelector } from "../app/hooks";

/** Subscribe to privacy mode so components re-run formatters on toggle. */
export function useFinancialValuesHidden(): boolean {
  return useAppSelector((state) => state.ui.valuesHidden);
}