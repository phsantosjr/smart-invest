import type { InstitutionType } from "../../../types/accounts";

export function institutionMonogram(name: string): string {
  const normalized = name.trim();
  const upper = normalized.toUpperCase();
  if (upper.startsWith("XP")) return "XP";
  if (upper.startsWith("BTG")) return "BTG";
  if (upper.includes("INTER")) return "INT";
  if (upper.startsWith("ITAU") || upper.startsWith("ITAÚ")) return "IT";
  if (upper.includes("NUINVEST") || upper.includes("NUBANK")) return "NU";
  if (upper.startsWith("CLEAR")) return "CL";
  if (upper.startsWith("RICO")) return "RC";

  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}${parts[1][1] ?? ""}`.toUpperCase();
  }
  return normalized.slice(0, 3).toUpperCase();
}

export function isBrokerageInstitution(type: InstitutionType): boolean {
  return type === "BROKERAGE" || type === "BOTH";
}

export function isBankInstitution(type: InstitutionType): boolean {
  return type === "BANK" || type === "BOTH";
}