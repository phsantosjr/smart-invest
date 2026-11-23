import { render, screen, within } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { store } from "../src/app/store";
import { ThemeProvider } from "../src/app/ThemeProvider";
import { loadCurrentUser } from "../src/features/auth/authSlice";
import { PortfolioPage } from "../src/features/portfolio/pages/PortfolioPage";
import { resetPortfolio } from "../src/features/portfolio/portfolioSlice";
import { setAccessToken } from "../src/features/auth/authSlice";
import { setThemeMode } from "../src/features/ui/uiSlice";
import * as accountsApi from "../src/services/accountsApi";
import * as portfolioApi from "../src/services/portfolioApi";

vi.mock("../src/services/accountsApi", () => ({
  fetchBrokerageAccounts: vi.fn(),
}));

vi.mock("../src/services/portfolioApi", () => ({
  fetchPortfolio: vi.fn(),
  fetchAssets: vi.fn(),
  createTransaction: vi.fn(),
}));

vi.mock("../src/services/authApi", () => ({
  fetchMe: vi.fn().mockResolvedValue({
    id: "user-1",
    household_id: null,
    name: "Lucas Souza",
    email: "lucas@test.com",
    is_household_owner: false,
    is_2fa_enabled: false,
  }),
}));

function renderPortfolio() {
  return render(
    <Provider store={store}>
      <ThemeProvider>
        <MemoryRouter>
          <PortfolioPage />
        </MemoryRouter>
      </ThemeProvider>
    </Provider>,
  );
}

describe("PortfolioPage", () => {
  beforeEach(() => {
    store.dispatch(resetPortfolio());
    store.dispatch(setThemeMode("dark"));
    store.dispatch(setAccessToken("test-token"));
    document.documentElement.classList.add("dark");
    vi.mocked(accountsApi.fetchBrokerageAccounts).mockResolvedValue([]);
    vi.mocked(portfolioApi.fetchPortfolio).mockResolvedValue({
      scope: "household",
      positions: [
        {
          brokerage_account_id: "acc-1",
          asset_id: "asset-1",
          user_id: "user-1",
          ticker: "PETR4",
          name: "Petrobras PN",
          asset_type: "STOCK",
          quantity: "100.000000",
          average_price: "35.5000",
          invested_amount: "3550.0000",
          current_price: "35.5000",
          current_value: "3550.0000",
          has_market_quote: false,
          last_quoted_at: null,
          quote_source: null,
        },
      ],
    });
  });

  it("renders scope controls and holdings from the API", async () => {
    await store.dispatch(loadCurrentUser());
    renderPortfolio();

    expect(await screen.findByRole("button", { name: /Consolidado household/i })).toBeTruthy();
    expect(await screen.findByText("PETR4")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Novo Lançamento/i })).toBeTruthy();
    const chartHeading = screen.getByRole("heading", { name: "Valor atual por categoria" });
    const chart = chartHeading.closest("section");
    expect(chart).toBeTruthy();
    expect(within(chart as HTMLElement).getByRole("row", { name: /Ações/ }).textContent).toMatch(
      /R\$\s*3\.550,00/,
    );
  });
});