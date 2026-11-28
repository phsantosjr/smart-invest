import { configureStore } from "@reduxjs/toolkit";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { beforeEach, describe, expect, it } from "vitest";

import { ThemeProvider } from "../src/app/ThemeProvider";
import { ValuesVisibilityToggle } from "../src/components/ValuesVisibilityToggle";
import authReducer from "../src/features/auth/authSlice";
import uiReducer, { VALUES_HIDDEN_STORAGE_KEY } from "../src/features/ui/uiSlice";
import { registerValuesHiddenReader } from "../src/utils/money";

function renderToggle(valuesHidden = false) {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      ui: uiReducer,
    },
    preloadedState: {
      ui: { themeMode: "light" as const, sidebarCollapsed: false, valuesHidden },
    },
  });
  registerValuesHiddenReader(() => store.getState().ui.valuesHidden);

  return {
    store,
    ...render(
      <Provider store={store}>
        <ThemeProvider>
          <ValuesVisibilityToggle />
        </ThemeProvider>
      </Provider>,
    ),
  };
}

describe("ValuesVisibilityToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    registerValuesHiddenReader(() => false);
  });

  it("hides values and persists preference", async () => {
    const user = userEvent.setup();
    renderToggle(false);

    await user.click(screen.getByRole("button", { name: "Ocultar valores financeiros" }));

    expect(screen.getByRole("button", { name: "Mostrar valores financeiros" })).toBeTruthy();
    expect(localStorage.getItem(VALUES_HIDDEN_STORAGE_KEY)).toBe("1");
  });

  it("shows values again when toggled off", async () => {
    const user = userEvent.setup();
    renderToggle(true);

    await user.click(screen.getByRole("button", { name: "Mostrar valores financeiros" }));

    expect(screen.getByRole("button", { name: "Ocultar valores financeiros" })).toBeTruthy();
    expect(localStorage.getItem(VALUES_HIDDEN_STORAGE_KEY)).toBe("0");
  });
});