import api from "./api";

export type MarketQuoteSyncResult = {
  provider: string;
  updated_count: number;
  failed_tickers: string[];
  sync_run_id: string;
  providers_used: string | null;
};

export type MarketQuoteSyncRun = {
  id: string;
  triggered_by_user_id: string | null;
  trigger: "MANUAL" | "SCHEDULED";
  status: string;
  started_at: string;
  finished_at: string | null;
  primary_provider: string;
  updated_count: number;
  failed_tickers: string[];
  providers_used: string | null;
  message: string | null;
};

export async function syncMarketQuotes(
  assetIds?: string[],
): Promise<MarketQuoteSyncResult> {
  const payload = assetIds?.length ? { asset_ids: assetIds } : {};
  const { data } = await api.post<MarketQuoteSyncResult>("/market-prices/sync", payload);
  return data;
}

export async function fetchMarketQuoteSyncRuns(): Promise<MarketQuoteSyncRun[]> {
  const { data } = await api.get<MarketQuoteSyncRun[]>("/market-prices/sync-runs");
  return data;
}