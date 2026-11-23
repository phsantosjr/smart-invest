import type { Asset } from "../../../types/assets";
import { formatIsoDate } from "../../transactions/utils/assetDisplay";

export type IndexerFilter = "all" | "cdi" | "pre" | "ipca" | "exempt";

const EXEMPT_INSTRUMENT_MARKERS = ["LCI", "LCA", "CRI", "CRA", "DEBÊNTURE", "DEBENTURE"];

export function detectInstrumentBadge(name: string, assetType: string): string {
  const upper = name.toUpperCase();
  const markers = ["CDB", "LCI", "LCA", "CRI", "CRA", "LC ", "RDB"] as const;
  for (const marker of markers) {
    if (upper.includes(marker.trim()) || upper.startsWith(marker)) {
      return marker.trim();
    }
  }
  if (assetType === "TREASURY") {
    return "TD";
  }
  return "RF";
}

export function instrumentBadgeClass(badge: string): string {
  switch (badge) {
    case "CDB":
      return "bg-tertiary-container text-on-tertiary";
    case "LCI":
      return "bg-secondary-container text-on-secondary";
    case "CRI":
      return "bg-primary-container text-on-primary";
    case "LCA":
      return "bg-surface-bright text-on-surface";
    case "TD":
      return "bg-tertiary-container text-on-tertiary";
    default:
      return "bg-surface-container-high text-on-surface";
  }
}

export function isTaxExempt(asset: Asset, instrumentBadge: string): boolean {
  const haystack = `${asset.name} ${asset.issuer ?? ""}`.toUpperCase();
  if (EXEMPT_INSTRUMENT_MARKERS.some((marker) => haystack.includes(marker))) {
    return true;
  }
  return ["LCI", "LCA", "CRI", "CRA"].includes(instrumentBadge);
}

export function taxExemptionLabel(exempt: boolean): string {
  return exempt ? "Isento de IR" : "Tributável (IR Regr. 15%)";
}

export function indexerRateLabel(asset: Asset): { primary: string; secondary: string } {
  const indexer = asset.indexer?.trim();
  const name = asset.name.toUpperCase();

  if (indexer) {
    const upper = indexer.toUpperCase();
    if (upper.includes("CDI") || upper.includes("DI")) {
      return { primary: indexer, secondary: "Pós-fixado DI" };
    }
    if (upper.includes("IPCA") || upper.includes("IGP")) {
      return { primary: indexer, secondary: "IPCA+ / Inflação" };
    }
    if (indexer.includes("%")) {
      return { primary: indexer, secondary: "Taxa Prefixada" };
    }
    return { primary: indexer, secondary: "Indexador" };
  }

  if (name.includes("CDI") || name.includes("% DO CDI")) {
    const match = asset.name.match(/\d+[,.]?\d*\s*%?\s*(do\s+)?cdi/i);
    return {
      primary: match?.[0] ?? "CDI",
      secondary: "Pós-fixado DI",
    };
  }
  if (name.includes("IPCA")) {
    return { primary: "IPCA+", secondary: "IPCA+ / Inflação" };
  }
  const preMatch = asset.name.match(/\d+[,.]?\d*\s*%?\s*a\.?\s*a\.?/i);
  if (preMatch) {
    return { primary: preMatch[0], secondary: "Taxa Prefixada" };
  }
  return { primary: "—", secondary: "—" };
}

export function indexerFilterTags(
  asset: Asset,
  instrumentBadge: string,
  taxExempt: boolean,
): IndexerFilter[] {
  const tags: IndexerFilter[] = [];
  const { secondary } = indexerRateLabel(asset);
  const secondaryLower = secondary.toLowerCase();
  const nameLower = asset.name.toLowerCase();
  const indexerLower = asset.indexer?.toLowerCase() ?? "";

  if (
    secondaryLower.includes("pós-fixado") ||
    nameLower.includes("cdi") ||
    indexerLower.includes("cdi")
  ) {
    tags.push("cdi");
  }
  if (secondaryLower.includes("prefixad") || nameLower.match(/\d+.*a\.a/)) {
    tags.push("pre");
  }
  if (
    secondaryLower.includes("ipca") ||
    nameLower.includes("ipca") ||
    indexerLower.includes("ipca")
  ) {
    tags.push("ipca");
  }
  if (taxExempt) {
    tags.push("exempt");
  }

  if (instrumentBadge === "CDB" && !tags.includes("cdi") && !tags.includes("pre")) {
    tags.push("cdi");
  }

  return tags;
}

export function matchesIndexerFilter(tags: IndexerFilter[], filter: IndexerFilter): boolean {
  if (filter === "all") {
    return true;
  }
  return tags.includes(filter);
}

export function monthsUntilMaturity(maturityDate: string | null): string | null {
  if (!maturityDate) {
    return null;
  }
  const end = new Date(`${maturityDate}T12:00:00`);
  const now = new Date();
  if (Number.isNaN(end.getTime())) {
    return null;
  }
  const diffMs = end.getTime() - now.getTime();
  const months = Math.round(diffMs / (1000 * 60 * 60 * 24 * 30.44));
  if (months < 0) {
    return "Vencido";
  }
  if (months <= 3) {
    return "Vence logo";
  }
  return `${months}m`;
}

export function formatMaturityLine(maturityDate: string | null): string | null {
  if (!maturityDate) {
    return null;
  }
  const suffix = monthsUntilMaturity(maturityDate);
  if (!suffix) {
    return `→ ${formatIsoDate(maturityDate)}`;
  }
  return `→ ${formatIsoDate(maturityDate)} (${suffix})`;
}

export function formatValuationRecency(
  valuationDate: string | null,
  createdAt: string | null,
): string {
  if (!valuationDate && !createdAt) {
    return "Sem marcação";
  }
  const reference = valuationDate
    ? new Date(`${valuationDate}T12:00:00`)
  : createdAt
    ? new Date(createdAt)
    : null;
  if (!reference || Number.isNaN(reference.getTime())) {
    return "—";
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  reference.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - reference.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) {
    if (createdAt) {
      const created = new Date(createdAt);
      if (!Number.isNaN(created.getTime())) {
        return `Hoje ${new Intl.DateTimeFormat("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }).format(created)}`;
      }
    }
    return "Hoje";
  }
  if (diffDays === 1) {
    return "Ontem";
  }
  return `Há ${diffDays} dias`;
}

export function estimateNetBalance(gross: number, invested: number, taxExempt: boolean): number {
  if (taxExempt || gross <= invested) {
    return gross;
  }
  const gain = gross - invested;
  return gross - gain * 0.15;
}