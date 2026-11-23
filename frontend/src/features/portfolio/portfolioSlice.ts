import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type { RootState } from "../../app/store";
import { getErrorMessage } from "../../services/api";
import * as accountsApi from "../../services/accountsApi";
import * as portfolioApi from "../../services/portfolioApi";
import type { PortfolioDashboardData, PortfolioScopeId } from "../../types/portfolio";
import {
  buildAllocation,
  mapPortfolioToDashboard,
  portfolioScopeToApi,
} from "./utils/mapPortfolioView";

type RequestStatus = "idle" | "loading" | "failed";

type PortfolioState = {
  scope: PortfolioScopeId;
  data: PortfolioDashboardData;
  status: RequestStatus;
  error: string | null;
};

const emptyDashboard: PortfolioDashboardData = {
  consolidatedNetWorth: "—",
  scopeMembers: [
    {
      id: "consolidated",
      name: "Consolidado household",
      roleLabel: "",
      initials: "",
      netWorth: "—",
      accent: "secondary",
    },
    {
      id: "self",
      name: "Minha carteira",
      roleLabel: "Titular",
      initials: "—",
      netWorth: "—",
      accent: "primary",
    },
  ],
  kpis: [],
  dividends: [],
  allocation: buildAllocation([]),
  allocationMeta: { volatility12m: "—", sharpe: "—", benchmarkCdi12m: "—" },
  rebalance: [],
  suggestedContribution: "—",
  holdings: [],
  holdingsTotal: 0,
  holdingsClassCounts: { all: 0 },
};

const initialState: PortfolioState = {
  scope: "consolidated",
  data: emptyDashboard,
  status: "idle",
  error: null,
};

export const loadPortfolioPage = createAsyncThunk(
  "portfolio/loadPage",
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const scope = state.portfolio.scope;
      const apiScope = portfolioScopeToApi(scope);
      const [portfolio, accounts] = await Promise.all([
        portfolioApi.fetchPortfolio(apiScope),
        accountsApi.fetchBrokerageAccounts(),
      ]);
      return mapPortfolioToDashboard(portfolio, accounts, state.auth.currentUser);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

const portfolioSlice = createSlice({
  name: "portfolio",
  initialState,
  reducers: {
    setPortfolioScope(state, action: PayloadAction<PortfolioScopeId>) {
      state.scope = action.payload;
    },
    resetPortfolio() {
      return initialState;
    },
    clearPortfolioError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadPortfolioPage.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(loadPortfolioPage.fulfilled, (state, action) => {
        state.status = "idle";
        state.data = action.payload;
      })
      .addCase(loadPortfolioPage.rejected, (state, action) => {
        state.status = "failed";
        state.error =
          (action.payload as string) ?? "Não foi possível carregar a carteira.";
      });
  },
});

export const { setPortfolioScope, resetPortfolio, clearPortfolioError } =
  portfolioSlice.actions;
export default portfolioSlice.reducer;