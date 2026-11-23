import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { store } from "../src/app/store";
import { ThemeProvider } from "../src/app/ThemeProvider";
import { NewTransactionPage } from "../src/features/transactions/pages/NewTransactionPage";
import { setAccessToken } from "../src/features/auth/authSlice";
import * as accountsApi from "../src/services/accountsApi";
import * as portfolioApi from "../src/services/portfolioApi";
import * as transactionsApi from "../src/services/transactionsApi";

vi.mock("../src/services/accountsApi", () => ({
  fetchBrokerageAccounts: vi.fn(),
}));

vi.mock("../src/services/portfolioApi", () => ({
  fetchPortfolio: vi.fn(),
  fetchAssets: vi.fn(),
  createTransaction: vi.fn(),
}));

vi.mock("../src/services/transactionsApi", () => ({
  fetchTransactions: vi.fn(),
}));

function renderForm() {
  return render(
    <Provider store={store}>
      <ThemeProvider>
        <MemoryRouter>
          <NewTransactionPage />
        </MemoryRouter>
      </ThemeProvider>
    </Provider>,
  );
}

describe("NewTransactionPage", () => {
  beforeEach(() => {
    store.dispatch(setAccessToken("test-token"));
    vi.mocked(accountsApi.fetchBrokerageAccounts).mockResolvedValue([
      {
        id: "acc-1",
        user_id: "user-1",
        institution_id: "inst-1",
        account_number: "12345",
        created_at: "2026-01-01T00:00:00Z",
        institution: {
          id: "inst-1",
          name: "XP Investimentos",
          code: "102",
          institution_type: "BROKERAGE",
        },
      },
    ]);
    vi.mocked(portfolioApi.fetchAssets).mockResolvedValue([
      {
        id: "asset-1",
        ticker: "PETR4",
        name: "Petrobras PN",
        asset_type: "STOCK",
        issuer: null,
        maturity_date: null,
        indexer: null,
        created_at: "2026-01-01T00:00:00Z",
      },
    ]);
    vi.mocked(portfolioApi.createTransaction).mockResolvedValue({
      id: "tx-1",
      brokerage_account_id: "acc-1",
      asset_id: "asset-1",
      transaction_type: "BUY",
      quantity: "10",
      unit_price: "30",
      fees: "0",
      transaction_date: "2026-03-10",
      total_amount: "300",
      created_at: "2026-03-10T12:00:00Z",
    });
    vi.mocked(transactionsApi.fetchTransactions).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      page_size: 3,
    });
    vi.mocked(portfolioApi.fetchPortfolio).mockResolvedValue({
      scope: "self",
      positions: [
        {
          brokerage_account_id: "acc-1",
          asset_id: "asset-1",
          user_id: "user-1",
          ticker: "PETR4",
          name: "Petrobras PN",
          asset_type: "STOCK",
          quantity: "50.000000",
          average_price: "30.0000",
          invested_amount: "1500.0000",
          current_price: "30.0000",
          current_value: "1500.0000",
          has_market_quote: false,
          last_quoted_at: null,
          quote_source: null,
        },
      ],
    });
  });

  it("submits a buy transaction", async () => {
    const user = userEvent.setup();
    renderForm();

    expect(await screen.findByRole("heading", { name: "Novo lançamento" })).toBeTruthy();

    await user.clear(screen.getByLabelText("Quantidade"));
    await user.type(screen.getByLabelText("Quantidade"), "10");
    await user.clear(screen.getByLabelText("Preço unitário"));
    await user.type(screen.getByLabelText("Preço unitário"), "30");
    await user.click(screen.getByRole("button", { name: /Salvar lançamento/i }));

    expect(portfolioApi.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        transaction_type: "BUY",
        quantity: "10",
        unit_price: "30",
      }),
    );
  });
});