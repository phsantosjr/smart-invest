import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type ThemeMode = "light" | "dark";
export const THEME_STORAGE_KEY = "smart-invest-theme";

type UiState = {
  themeMode: ThemeMode;
  sidebarCollapsed: boolean;
};

function readStoredTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }
  return localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
}

const initialState: UiState = {
  themeMode: readStoredTheme(),
  sidebarCollapsed: false,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    hydrateTheme(state, action: PayloadAction<ThemeMode>) {
      state.themeMode = action.payload;
    },
    setThemeMode(state, action: PayloadAction<ThemeMode>) {
      state.themeMode = action.payload;
    },
    toggleThemeMode(state) {
      state.themeMode = state.themeMode === "light" ? "dark" : "light";
    },
    toggleSidebarCollapsed(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
  },
});

export const { hydrateTheme, setThemeMode, toggleThemeMode, toggleSidebarCollapsed } =
  uiSlice.actions;
export default uiSlice.reducer;