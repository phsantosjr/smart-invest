import type { IncomeEvent, IncomeEventListResponse, IncomeEventWrite } from "../types/incomeEvents";
import type {
  IncomeMonthlyResponse,
  ReinvestmentAnalysisResponse,
} from "../types/incomeReports";
import type { IncomeAssetSummaryResponse } from "../types/incomeSummary";
import api from "./api";

export async function createIncomeEvent(payload: IncomeEventWrite): Promise<IncomeEvent> {
  const { data } = await api.post<IncomeEvent>("/income-events", payload);
  return data;
}

export async function fetchIncomeSummaryByAsset(params?: {
  scope?: "self" | "household";
}): Promise<IncomeAssetSummaryResponse> {
  const { data } = await api.get<IncomeAssetSummaryResponse>(
    "/income-events/summary-by-asset",
    { params },
  );
  return data;
}

export async function fetchIncomeEvents(params?: {
  start_date?: string;
  end_date?: string;
  asset_id?: string;
  brokerage_account_id?: string;
  scope?: "self" | "household";
}): Promise<IncomeEventListResponse> {
  const { data } = await api.get<IncomeEventListResponse>("/income-events", { params });
  return data;
}

export async function fetchIncomeMonthlyReport(params?: {
  month?: string;
  asset_id?: string;
  scope?: "self" | "household";
}): Promise<IncomeMonthlyResponse> {
  const { data } = await api.get<IncomeMonthlyResponse>("/income-events/monthly", { params });
  return data;
}

export async function fetchReinvestmentAnalysis(params?: {
  target_month?: string;
  year?: number;
  scope?: "self" | "household";
}): Promise<ReinvestmentAnalysisResponse> {
  const { data } = await api.get<ReinvestmentAnalysisResponse>("/income-events/reinvestment", {
    params,
  });
  return data;
}