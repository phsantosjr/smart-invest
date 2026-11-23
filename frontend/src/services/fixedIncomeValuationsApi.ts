import type {
  FixedIncomeValuation,
  FixedIncomeValuationWrite,
} from "../types/fixedIncomeValuation";
import api from "./api";

export async function createFixedIncomeValuation(
  payload: FixedIncomeValuationWrite,
): Promise<FixedIncomeValuation> {
  const { data } = await api.post<FixedIncomeValuation>("/fixed-income-valuations", payload);
  return data;
}

export async function fetchFixedIncomeValuations(params?: {
  brokerage_account_id?: string;
  asset_id?: string;
}): Promise<FixedIncomeValuation[]> {
  const { data } = await api.get<FixedIncomeValuation[]>("/fixed-income-valuations", { params });
  return data;
}