import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { store } from "../src/app/store";
import { ThemeProvider } from "../src/app/ThemeProvider";
import { AssetsPage } from "../src/features/assets/pages/AssetsPage";
import { resetAssets } from "../src/features/assets/assetsSlice";
import { setAccessToken } from "../src/features/auth/authSlice";
import * as assetsApi from "../src/services/assetsApi";

vi.mock("../src/services/assetsApi", () => ({
  fetchAssets: vi.fn(),
  fetchAsset: vi.fn(),
  createAsset: vi.fn(),
  updateAsset: vi.fn(),
}));

const sampleAsset = {
  id: "asset-1",
  ticker: "PETR4",
  name: "Petrobras PN",
  asset_type: "STOCK" as const,
  issuer: null,
  maturity_date: null,
  indexer: null,
  created_at: "2026-01-01T00:00:00Z",
};

function renderAssetsPage() {
  return render(
    <Provider store={store}>
      <ThemeProvider>
        <MemoryRouter>
          <AssetsPage />
        </MemoryRouter>
      </ThemeProvider>
    </Provider>,
  );
}

describe("AssetsPage", () => {
  beforeEach(() => {
    store.dispatch(resetAssets());
    store.dispatch(setAccessToken("test-token"));
    vi.mocked(assetsApi.fetchAssets).mockResolvedValue([sampleAsset]);
  });

  it("lists assets and opens create form", async () => {
    const user = userEvent.setup();
    renderAssetsPage();

    expect(await screen.findByRole("heading", { name: "Ativos" })).toBeTruthy();
    expect(await screen.findByText("PETR4")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /Novo ativo/i }));
    expect(screen.getByRole("heading", { name: "Cadastrar ativo" })).toBeTruthy();
  });
});