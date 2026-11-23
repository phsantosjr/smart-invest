import api from "./api";

export type MarketPriceRecord = {
  id: string;
  asset_id: string;
  price: string;
  quoted_at: string;
  source: string;
  recorded_by_user_id: string | null;
  created_at: string;
};

export type CreateMarketPricePayload = {
  asset_id: string;
  price: string;
  quoted_at?: string;
};

export async function createMarketPrice(
  payload: CreateMarketPricePayload,
): Promise<MarketPriceRecord> {
  const { data } = await api.post<MarketPriceRecord>("/market-prices", payload);
  return data;
}

export async function fetchMarketPriceHistory(assetId: string): Promise<MarketPriceRecord[]> {
  const { data } = await api.get<MarketPriceRecord[]>(`/market-prices/${assetId}`);
  return data;
}