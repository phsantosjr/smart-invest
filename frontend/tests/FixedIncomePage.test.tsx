import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { store } from "../src/app/store";
import { ThemeProvider } from "../src/app/ThemeProvider";
import { setAccessToken } from "../src/features/auth/authSlice";
import { FixedIncomePage } from "../src/features/fixed-income/pages/FixedIncomePage";
import * as portfolioApi from "../src/services/portfolioApi";
import * as accountsApi from "../src/services/accountsApi";
import * as assetsApi from "../src/services/assetsApi";
import * as valuationsApi from "../src/services/fixedIncomeValuationsApi";

vi.mock("../src/services/portfolioApi", () => ({
  fetchPortfolio: vi.fn(),
}));

vi.mock("../src/services/accountsApi", () => ({
  fetchBrokerageAccounts: vi.fn(),
}));

vi.mock("../src/services/assetsApi", () => ({
  fetchAssets: vi.fn(),
}));

vi.mock("../src/services/fixedIncomeValuationsApi", () => ({
  fetchFixedIncomeValuations: vi.fn(),
  createFixedIncomeValuation: vi.fn(),
}));

describe("FixedIncomePage", () => {
  beforeEach(() => {
    store.dispatch(setAccessToken("test-token"));
    vi.mocked(portfolioApi.fetchPortfolio).mockResolvedValue({
      scope: "household",
      positions: [
        {
          brokerage_account_id: "acc-1",
          asset_id: "asset-1",
          user_id: "user-1",
          ticker: null,
          name: "LCI BTG Pactual 92% CDI",
          asset_type: "FIXED_INCOME",
          quantity: "1",
          average_price: "40000",
          invested_amount: "40000",
          current_value: "43180.50",
          has_market_quote: true,
          current_price: null,
          last_quoted_at: null,
          quote_source: null,
        },
      ],
    });
    vi.mocked(accountsApi.fetchBrokerageAccounts).mockResolvedValue([
      {
        id: "acc-1",
        user_id: "user-1",
        institution_id: "inst-1",
        account_number: "99",
        created_at: "2024-01-01T00:00:00Z",
        institution: {
          id: "inst-1",
          name: "BTG Pactual",
          code: null,
          institution_type: "BROKERAGE",
        },
      },
    ]);
    vi.mocked(assetsApi.fetchAssets).mockResolvedValue([
      {
        id: "asset-1",
        ticker: null,
        name: "LCI BTG Pactual 92% CDI",
        asset_type: "FIXED_INCOME",
        issuer: "Banco BTG Pactual",
        maturity_date: "2025-11-10",
        indexer: "92% CDI",
        created_at: "2024-01-01T00:00:00Z",
      },
    ]);
    vi.mocked(valuationsApi.fetchFixedIncomeValuations).mockResolvedValue([]);
  });

  it("renders fixed income list from portfolio data", async () => {
    render(
      <Provider store={store}>
        <ThemeProvider>
          <MemoryRouter>
            <FixedIncomePage />
          </MemoryRouter>
        </ThemeProvider>
      </Provider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: /Renda Fixa & Títulos Manuais/i,
      }),
    ).toBeTruthy();
    expect(await screen.findByText("LCI BTG Pactual 92% CDI")).toBeTruthy();
    expect(screen.getByText("BTG Pactual")).toBeTruthy();
    expect(screen.getByText(/Isento de IR/i)).toBeTruthy();
  });
});