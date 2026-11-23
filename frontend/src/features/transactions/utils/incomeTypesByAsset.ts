import type { AssetType } from "../../../types/assets";
import type { IncomeType } from "../../../types/incomeEvents";

const INCOME_TYPES_BY_ASSET: Record<AssetType, IncomeType[]> = {
  STOCK: ["DIVIDEND", "JCP", "STOCK_YIELD"],
  FII: ["FII_YIELD"],
  TREASURY: ["COUPON"],
  FIXED_INCOME: ["COUPON"],
  FUND: ["COUPON"],
};

export function allowedIncomeTypes(assetType: string): IncomeType[] {
  return INCOME_TYPES_BY_ASSET[assetType as AssetType] ?? [];
}