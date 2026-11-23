import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

import { store } from "../src/app/store";
import { ThemeProvider } from "../src/app/ThemeProvider";
import { LoginPage } from "../src/features/auth/pages/LoginPage";
import { setThemeMode } from "../src/features/ui/uiSlice";

function renderLogin() {
  return render(
    <Provider store={store}>
      <ThemeProvider>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </ThemeProvider>
    </Provider>,
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    store.dispatch(setThemeMode("light"));
    document.documentElement.classList.remove("dark");
  });

  it("renders the login form without circular store errors", () => {
    renderLogin();

    expect(screen.getByRole("heading", { name: "Entrar" })).toBeTruthy();
    expect(screen.getByLabelText("E-mail")).toBeTruthy();
    expect(screen.getByLabelText("Senha")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Entrar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ativar tema escuro" })).toBeTruthy();
  });

  it("toggles dark mode from the login screen", async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole("button", { name: "Ativar tema escuro" }));

    expect(screen.getByRole("button", { name: "Ativar tema claro" })).toBeTruthy();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});

