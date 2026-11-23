import { describe, expect, it } from "vitest";

import uiReducer, { hydrateTheme, setThemeMode, toggleThemeMode } from "../src/features/ui/uiSlice";

describe("uiSlice", () => {
  it("toggles between light and dark", () => {
    const dark = uiReducer({ themeMode: "light" }, toggleThemeMode());
    expect(dark.themeMode).toBe("dark");

    const light = uiReducer(dark, toggleThemeMode());
    expect(light.themeMode).toBe("light");
  });

  it("sets and hydrates theme mode", () => {
    expect(uiReducer({ themeMode: "light" }, setThemeMode("dark")).themeMode).toBe("dark");
    expect(uiReducer({ themeMode: "dark" }, hydrateTheme("light")).themeMode).toBe("light");
  });
});
