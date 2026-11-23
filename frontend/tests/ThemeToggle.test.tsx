import { configureStore } from "@reduxjs/toolkit";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { beforeEach, describe, expect, it } from "vitest";

import { ThemeProvider } from "../src/app/ThemeProvider";
import { ThemeToggle } from "../src/components/ThemeToggle";
import authReducer from "../src/features/auth/authSlice";
import { THEME_STORAGE_KEY } from "../src/features/ui/uiSlice";
import uiReducer from "../src/features/ui/uiSlice";

function renderToggle(themeMode: "light" | "dark" = "light") {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      ui: uiReducer,
    },
    preloadedState: {
      ui: { themeMode },
    },
  });

  return {
    store,
    ...render(
      <Provider store={store}>
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      </Provider>,
    ),
  };
}

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("activates dark theme from the control", async () => {
    const user = userEvent.setup();
    renderToggle("light");

    await user.click(screen.getByRole("button", { name: "Ativar tema escuro" }));

    expect(screen.getByRole("button", { name: "Ativar tema claro" })).toBeTruthy();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });

  it("restores light theme from the control", async () => {
    const user = userEvent.setup();
    renderToggle("dark");

    await user.click(screen.getByRole("button", { name: "Ativar tema claro" }));

    expect(screen.getByRole("button", { name: "Ativar tema escuro" })).toBeTruthy();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });
});
