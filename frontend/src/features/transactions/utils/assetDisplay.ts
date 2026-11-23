import type { Asset, AssetType } from "../../../types/assets";

export const ASSET_TYPE_LABEL: Record<AssetType, string> = {
  STOCK: "Ação",
  FII: "FII",
  TREASURY: "Tesouro Direto",
  FIXED_INCOME: "Renda fixa",
  FUND: "Fundo",
};

const TICKER_TYPES: AssetType[] = ["STOCK", "FII"];

export function assetTypeLabel(assetType: string): string {
  return ASSET_TYPE_LABEL[assetType as AssetType] ?? assetType;
}

export function assetExpectsTicker(assetType: string): boolean {
  return TICKER_TYPES.includes(assetType as AssetType);
}

export function formatAssetSearchText(asset: Asset): string {
  return [asset.ticker, asset.name, asset.issuer, asset.indexer]
    .filter(Boolean)
    .join(" ")
    .toUpperCase();
}

/** Option label aligned with catalog rules (ticker or name + RF metadata). */
export function formatAssetOptionLabel(asset: Asset): string {
  if (asset.ticker) {
    return `${asset.ticker} — ${asset.name}`;
  }
  const parts = [asset.name];
  if (asset.issuer) {
    parts.push(`· ${asset.issuer}`);
  }
  if (asset.indexer) {
    parts.push(`(${asset.indexer})`);
  }
  if (asset.maturity_date) {
    parts.push(`venc. ${formatIsoDate(asset.maturity_date)}`);
  }
  return parts.join(" ");
}

export function formatIsoDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  if (!year || !month || !day) {
    return iso;
  }
  return `${day}/${month}/${year}`;
}

export type AssetDetailRow = { label: string; value: string };

export function buildAssetDetailRows(asset: Asset | null): AssetDetailRow[] {
  if (!asset) {
    return [];
  }
  const rows: AssetDetailRow[] = [
    { label: "Tipo", value: assetTypeLabel(asset.asset_type) },
    { label: "Nome", value: asset.name },
  ];
  if (asset.ticker) {
    rows.unshift({ label: "Ticker", value: asset.ticker });
  } else {
    rows.push({ label: "Ticker", value: "—" });
  }
  if (asset.issuer) {
    rows.push({ label: "Emissor", value: asset.issuer });
  }
  if (asset.indexer) {
    rows.push({ label: "Indexador", value: asset.indexer });
  }
  if (asset.maturity_date) {
    rows.push({ label: "Vencimento", value: formatIsoDate(asset.maturity_date) });
  }
  return rows;
}