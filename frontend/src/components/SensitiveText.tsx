import type { ReactNode } from "react";

import { useAppSelector } from "../app/hooks";
import { maskFormattedFinancialDisplay } from "../utils/financialPrivacy";

type SensitiveTextProps = {
  children: string;
  className?: string;
  as?: "span" | "p" | "div";
};

export function SensitiveText({ children, className, as: Tag = "span" }: SensitiveTextProps) {
  const valuesHidden = useAppSelector((state) => state.ui.valuesHidden);
  const display = maskFormattedFinancialDisplay(children, valuesHidden);
  return <Tag className={className}>{display}</Tag>;
}

type SensitiveMaybeProps = {
  value: ReactNode;
  formatted?: string;
  className?: string;
};

/** Masks `formatted` when hidden; otherwise renders `value` (e.g. live formatBrl output). */
export function SensitiveMaybe({ value, formatted, className }: SensitiveMaybeProps) {
  const valuesHidden = useAppSelector((state) => state.ui.valuesHidden);
  if (valuesHidden && formatted !== undefined) {
    return (
      <span className={className}>{maskFormattedFinancialDisplay(formatted, true)}</span>
    );
  }
  return <span className={className}>{value}</span>;
}