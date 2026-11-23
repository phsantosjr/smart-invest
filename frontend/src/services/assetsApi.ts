import type { Asset, AssetWrite } from "../types/assets";
import api from "./api";

export async function fetchAssets(): Promise<Asset[]> {
  const { data } = await api.get<Asset[]>("/assets");
  return data;
}

export async function fetchAsset(assetId: string): Promise<Asset> {
  const { data } = await api.get<Asset>(`/assets/${assetId}`);
  return data;
}

export async function createAsset(body: AssetWrite): Promise<Asset> {
  const { data } = await api.post<Asset>("/assets", body);
  return data;
}

export async function updateAsset(
  assetId: string,
  body: Partial<AssetWrite>,
): Promise<Asset> {
  const { data } = await api.patch<Asset>(`/assets/${assetId}`, body);
  return data;
}