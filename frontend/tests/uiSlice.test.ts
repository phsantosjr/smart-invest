import { describe, expect, it } from "vitest";

import uiReducer, {
  hydrateTheme,
  setThemeMode,
  setValuesHidden,
  toggleThemeMode,
  toggleValuesHidden,
} from "../src/features/ui/uiSlice";

const baseUi = {
  themeMode: "light" as const,
  sidebarCollapsed: false,
  valuesHidden: false,
};

describe("uiSlice", () => {
  it("toggles between light and dark", () => {
    const dark = uiReducer(baseUi, toggleThemeMode());
    expect(dark.themeMode).toBe("dark");

    const light = uiReducer(dark, toggleThemeMode());
    expect(light.themeMode).toBe("light");
  });

  it("sets and hydrates theme mode", () => {
    expect(uiReducer(baseUi, setThemeMode("dark")).themeMode).toBe("dark");
    expect(uiReducer({ ...baseUi, themeMode: "dark" }, hydrateTheme("light")).themeMode).toBe(
      "light",
    );
  });

  it("toggles financial values visibility", () => {
    const hidden = uiReducer(baseUi, toggleValuesHidden());
    expect(hidden.valuesHidden).toBe(true);
    expect(uiReducer(hidden, setValuesHidden(false)).valuesHidden).toBe(false);
  });
});
