import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { store } from "../src/app/store";
import { ThemeProvider } from "../src/app/ThemeProvider";
import { resetAccounts } from "../src/features/accounts/accountsSlice";
import { AccountsPage } from "../src/features/accounts/pages/AccountsPage";
import { setAccessToken } from "../src/features/auth/authSlice";
import * as accountsApi from "../src/services/accountsApi";
import type { BrokerageAccount, Institution } from "../src/types/accounts";

vi.mock("../src/services/accountsApi", () => ({
  fetchInstitutions: vi.fn(),
  fetchBrokerageAccounts: vi.fn(),
  createBrokerageAccount: vi.fn(),
  updateBrokerageAccount: vi.fn(),
  deleteBrokerageAccount: vi.fn(),
}));

const xp: Institution = {
  id: "inst-xp",
  name: "XP Investimentos",
  code: "102",
  institution_type: "BROKERAGE",
};

const inter: Institution = {
  id: "inst-inter",
  name: "Banco Inter",
  code: "077",
  institution_type: "BOTH",
};

const account: BrokerageAccount = {
  id: "acc-1",
  user_id: "user-1",
  institution_id: xp.id,
  account_number: "12345",
  created_at: "2026-01-01T00:00:00Z",
  institution: xp,
};

function renderAccounts() {
  return render(
    <Provider store={store}>
      <ThemeProvider>
        <MemoryRouter>
          <AccountsPage />
        </MemoryRouter>
      </ThemeProvider>
    </Provider>,
  );
}

describe("AccountsPage", () => {
  beforeEach(() => {
    store.dispatch(resetAccounts());
    store.dispatch(setAccessToken("test-token"));
    vi.mocked(accountsApi.fetchInstitutions).mockResolvedValue([inter, xp]);
    vi.mocked(accountsApi.fetchBrokerageAccounts).mockResolvedValue([]);
    vi.mocked(accountsApi.createBrokerageAccount).mockReset();
    vi.mocked(accountsApi.updateBrokerageAccount).mockReset();
    vi.mocked(accountsApi.deleteBrokerageAccount).mockReset();
  });

  it("renders ledger layout and allows creating an account", async () => {
    const user = userEvent.setup();
    vi.mocked(accountsApi.createBrokerageAccount).mockResolvedValue(account);

    renderAccounts();

    expect(
      await screen.findByRole("heading", { name: "Contas & Instituições" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: /Conectar Nova Instituição/i })).toBeTruthy();
    expect(screen.getByText("Nenhuma conta cadastrada.")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /Conectar Nova Instituição/i }));
    await user.selectOptions(screen.getByLabelText("Instituição"), xp.id);
    await user.type(screen.getByLabelText("Número da conta"), "12345");
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));

    expect(await screen.findByText("Conta: 12345")).toBeTruthy();
    expect(accountsApi.createBrokerageAccount).toHaveBeenCalledWith({
      institution_id: xp.id,
      account_number: "12345",
    });
  });

  it("shows duplicate error from the API", async () => {
    const user = userEvent.setup();
    vi.mocked(accountsApi.createBrokerageAccount).mockRejectedValue({
      response: { data: { detail: "Já existe uma conta com este número nesta instituição." } },
      isAxiosError: true,
    });

    renderAccounts();
    await screen.findByRole("heading", { name: "Contas & Instituições" });

    await user.click(screen.getByRole("button", { name: /Conectar Nova Instituição/i }));
    await user.selectOptions(screen.getByLabelText("Instituição"), xp.id);
    await user.type(screen.getByLabelText("Número da conta"), "12345");
    await user.click(screen.getByRole("button", { name: "Cadastrar" }));

    expect(
      await screen.findByText("Já existe uma conta com este número nesta instituição."),
    ).toBeTruthy();
  });

  it("lists existing accounts and confirms deletion", async () => {
    const user = userEvent.setup();
    vi.mocked(accountsApi.fetchBrokerageAccounts).mockResolvedValue([account]);
    vi.mocked(accountsApi.deleteBrokerageAccount).mockResolvedValue();

    renderAccounts();

    expect(await screen.findByText("Conta: 12345")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Excluir conta 12345" }));
    await user.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(accountsApi.deleteBrokerageAccount).toHaveBeenCalledWith("acc-1");
    expect(await screen.findByText("Nenhuma conta cadastrada.")).toBeTruthy();
  });
});