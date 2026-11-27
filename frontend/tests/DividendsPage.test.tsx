import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { store } from "../src/app/store";
import { ThemeProvider } from "../src/app/ThemeProvider";
import { setAccessToken } from "../src/features/auth/authSlice";
import { DividendsPage } from "../src/features/dividends/pages/DividendsPage";
import * as incomeEventsApi from "../src/services/incomeEventsApi";

vi.mock("../src/services/incomeEventsApi", () => ({
  fetchIncomeSummaryByAsset: vi.fn(),
  fetchIncomeEvents: vi.fn(),
  fetchIncomeMonthlyReport: vi.fn(),
  fetchReinvestmentAnalysis: vi.fn(),
}));

vi.mock("../src/services/assetsApi", () => ({
  fetchAssets: vi.fn().mockResolvedValue([]),
}));

describe("DividendsPage", () => {
  beforeEach(() => {
    store.dispatch(setAccessToken("test-token"));
    vi.mocked(incomeEventsApi.fetchIncomeEvents).mockResolvedValue({
      total_net_amount: "225.0000",
      items: [
        {
          id: "e1",
          brokerage_account_id: "b1",
          asset_id: "a3",
          income_type: "FII_YIELD",
          gross_amount: "50.0000",
          tax_withheld: "0",
          net_amount: "50.0000",
          ex_date: null,
          payment_date: "2025-06-01",
          created_at: "2025-06-01T00:00:00Z",
        },
        {
          id: "e2",
          brokerage_account_id: "b1",
          asset_id: "a1",
          income_type: "DIVIDEND",
          gross_amount: "75.0000",
          tax_withheld: "0",
          net_amount: "75.0000",
          ex_date: null,
          payment_date: "2026-03-15",
          created_at: "2026-03-15T00:00:00Z",
        },
        {
          id: "e3",
          brokerage_account_id: "b1",
          asset_id: "a2",
          income_type: "DIVIDEND",
          gross_amount: "100.0000",
          tax_withheld: "0",
          net_amount: "100.0000",
          ex_date: null,
          payment_date: "2026-08-20",
          created_at: "2026-08-20T00:00:00Z",
        },
      ],
    });
    vi.mocked(incomeEventsApi.fetchIncomeSummaryByAsset).mockResolvedValue({
      scope: "self",
      grand_total_net: "175.0000",
      rows: [
        {
          asset_id: "a1",
          ticker: "PETR4",
          name: "Petrobras",
          asset_type: "STOCK",
          total_net_amount: "75.0000",
          event_count: 2,
        },
        {
          asset_id: "a2",
          ticker: "VALE3",
          name: "Vale",
          asset_type: "STOCK",
          total_net_amount: "100.0000",
          event_count: 1,
        },
        {
          asset_id: "a3",
          ticker: "HGLG11",
          name: "CSHG Logística",
          asset_type: "FII",
          total_net_amount: "50.0000",
          event_count: 3,
        },
      ],
    });
  });

  it("renders consolidated dividends by asset", async () => {
    render(
      <Provider store={store}>
        <ThemeProvider>
          <MemoryRouter>
            <DividendsPage />
          </MemoryRouter>
        </ThemeProvider>
      </Provider>,
    );

    expect(await screen.findByRole("heading", { name: "Dividendos" })).toBeTruthy();
    expect(await screen.findByText("HGLG11")).toBeTruthy();
    expect(screen.queryByText("PETR4")).toBeNull();

    const { userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Dividendos de Ações" }));
    expect(await screen.findByText("PETR4")).toBeTruthy();
    expect(screen.getByText("VALE3")).toBeTruthy();
    expect(screen.queryByText("HGLG11")).toBeNull();
  });

  it("shows consolidated chart views per asset group", async () => {
    const { userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();

    render(
      <Provider store={store}>
        <ThemeProvider>
          <MemoryRouter>
            <DividendsPage />
          </MemoryRouter>
        </ThemeProvider>
      </Provider>,
    );

    await screen.findByText("HGLG11");
    await user.click(screen.getByRole("button", { name: "Gráficos" }));
    expect(await screen.findByText(/Total recebido por ano \(FIIs\)/i)).toBeTruthy();
    expect(screen.getByLabelText(/Gráfico de proventos por ano — FIIs/i)).toBeTruthy();
    expect(screen.getByLabelText(/Gráfico de proventos por ticker — FIIs/i)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Dividendos de Ações" }));
    expect(await screen.findByText(/Total recebido por ano \(ações\)/i)).toBeTruthy();
    expect(screen.getByLabelText(/Gráfico de proventos por ticker — ações/i)).toBeTruthy();
  });

  it("switches to monthly and reinvestment tabs", async () => {
    const { fetchIncomeMonthlyReport, fetchReinvestmentAnalysis } = incomeEventsApi;
    vi.mocked(fetchIncomeMonthlyReport).mockResolvedValue({
      total_net_amount: "180.0000",
      items: [
        { month: "2026-11", total_net_amount: "50.0000" },
        { month: "2026-10", total_net_amount: "130.0000" },
      ],
    });
    vi.mocked(fetchReinvestmentAnalysis).mockResolvedValue({
      fii_reinvestment: {
        income_month: "2026-11",
        purchase_month: "2026-11",
        total_income_received: "100.0000",
        total_purchased: "35.0000",
        missing_amount: "65.0000",
        needs_reinvestment: true,
        items: [
          {
            asset_id: "a1",
            ticker: "XRM11",
            income_received: "100.0000",
            amount_purchased: "35.0000",
            missing_amount: "65.0000",
            status: "PENDING",
          },
          {
            asset_id: "a2",
            ticker: "HGLG11",
            income_received: "50.0000",
            amount_purchased: "80.0000",
            missing_amount: "0",
            status: "COMPLETE",
          },
        ],
      },
      stocks_smart_invest: {
        year: 2026,
        total_income_received: "3200.0000",
        total_purchased: "2500.0000",
        missing_amount: "700.0000",
        needs_reinvestment: true,
      },
    });

    const { userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();

    render(
      <Provider store={store}>
        <ThemeProvider>
          <MemoryRouter>
            <DividendsPage />
          </MemoryRouter>
        </ThemeProvider>
      </Provider>,
    );

    await screen.findByText("HGLG11");
    await user.click(screen.getByRole("button", { name: "Dividendos de Ações" }));
    await screen.findByText("PETR4");
    await user.click(screen.getByRole("button", { name: "Histórico mês a mês" }));
    expect(await screen.findByText("11/2026")).toBeTruthy();
    expect(screen.getByText("10/2026")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Reinvestimento" }));
    expect(await screen.findByText(/Proventos recebidos \(11\/2026\)/i)).toBeTruthy();
    expect(await screen.findByText(/em FIIs para cobrir/i)).toBeTruthy();
    expect(screen.getByText("XRM11")).toBeTruthy();
  });

  it("highlights completed FII reinvestment rows with light green background", async () => {
    const { fetchReinvestmentAnalysis } = incomeEventsApi;
    vi.mocked(fetchReinvestmentAnalysis).mockResolvedValue({
      fii_reinvestment: {
        income_month: "2026-11",
        purchase_month: "2026-11",
        total_income_received: "50.0000",
        total_purchased: "80.0000",
        missing_amount: "0",
        needs_reinvestment: false,
        items: [
          {
            asset_id: "a2",
            ticker: "HGLG11",
            income_received: "50.0000",
            amount_purchased: "80.0000",
            missing_amount: "0",
            status: "COMPLETE",
          },
        ],
      },
      stocks_smart_invest: {
        year: 2026,
        total_income_received: "0",
        total_purchased: "0",
        missing_amount: "0",
        needs_reinvestment: false,
      },
    });

    const { userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();

    render(
      <Provider store={store}>
        <ThemeProvider>
          <MemoryRouter>
            <DividendsPage />
          </MemoryRouter>
        </ThemeProvider>
      </Provider>,
    );

    await screen.findByText("HGLG11");
    await user.click(screen.getByRole("button", { name: "Reinvestimento" }));
    const row = screen.getByText("HGLG11").closest("tr");
    expect(row?.className).toMatch(/bg-b3-green-soft/);
    expect(screen.getByText("Concluído")).toBeTruthy();
  });
});