export type AssetType = "STOCK" | "FII" | "TREASURY" | "FIXED_INCOME" | "FUND";

export type Asset = {
  id: string;
  ticker: string | null;
  name: string;
  asset_type: AssetType;
  issuer: string | null;
  maturity_date: string | null;
  indexer: string | null;
  created_at: string;
};

export type AssetWrite = {
  name: string;
  asset_type: AssetType;
  ticker?: string | null;
  issuer?: string | null;
  maturity_date?: string | null;
  indexer?: string | null;
};