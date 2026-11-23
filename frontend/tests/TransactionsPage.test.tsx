import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { store } from "../src/app/store";
import { ThemeProvider } from "../src/app/ThemeProvider";
import { setAccessToken } from "../src/features/auth/authSlice";
import { TransactionsPage } from "../src/features/transactions/pages/TransactionsPage";
import * as accountsApi from "../src/services/accountsApi";
import * as incomeEventsApi from "../src/services/incomeEventsApi";
import * as portfolioApi from "../src/services/portfolioApi";
import * as transactionsApi from "../src/services/transactionsApi";

vi.mock("../src/services/accountsApi", () => ({
  fetchBrokerageAccounts: vi.fn(),
}));

vi.mock("../src/services/incomeEventsApi", () => ({
  fetchIncomeEvents: vi.fn(),
}));

vi.mock("../src/services/portfolioApi", () => ({
  fetchAssets: vi.fn(),
}));

vi.mock("../src/services/transactionsApi", () => ({
  fetchTransactions: vi.fn(),
  createTransaction: vi.fn(),
  DEFAULT_TRANSACTION_PAGE_SIZE: 20,
}));

describe("TransactionsPage", () => {
  beforeEach(() => {
    store.dispatch(setAccessToken("test-token"));
    vi.mocked(accountsApi.fetchBrokerageAccounts).mockResolvedValue([
      {
        id: "acc-1",
        user_id: "u1",
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
    vi.mocked(incomeEventsApi.fetchIncomeEvents).mockResolvedValue({
      items: [],
      total_net_amount: "0",
    });
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
    vi.mocked(transactionsApi.fetchTransactions).mockResolvedValue({
      items: [
        {
          id: "tx-1",
          brokerage_account_id: "acc-1",
          asset_id: "asset-1",
          transaction_type: "BUY",
          quantity: "10",
          unit_price: "30",
          fees: "0",
          total_amount: "300",
          transaction_date: "2026-03-10",
          created_at: "2026-03-10T12:00:00Z",
          asset: {
            id: "asset-1",
            ticker: "PETR4",
            name: "Petrobras PN",
            asset_type: "STOCK",
          },
          brokerage_account: {
            id: "acc-1",
            account_number: "12345",
            institution_name: "XP Investimentos",
          },
        },
      ],
      total: 1,
      page: 1,
      page_size: 20,
    });
  });

  it("renders transaction list and new button", async () => {
    render(
      <Provider store={store}>
        <ThemeProvider>
          <MemoryRouter>
            <TransactionsPage />
          </MemoryRouter>
        </ThemeProvider>
      </Provider>,
    );

    expect(await screen.findByRole("heading", { name: "Lançamentos" })).toBeTruthy();
    expect(await screen.findByText("PETR4")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Novo lançamento/i })).toBeTruthy();
  });
});