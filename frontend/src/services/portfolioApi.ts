import type { PortfolioResponse, PortfolioScopeParam } from "../types/portfolioApi";
import api from "./api";

export { fetchAssets } from "./assetsApi";
export { createTransaction } from "./transactionsApi";

export async function fetchPortfolio(scope: PortfolioScopeParam): Promise<PortfolioResponse> {
  const { data } = await api.get<PortfolioResponse>("/portfolio", { params: { scope } });
  return data;
}