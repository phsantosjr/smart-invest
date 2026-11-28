import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type ThemeMode = "light" | "dark";
export const THEME_STORAGE_KEY = "smart-invest-theme";
export const VALUES_HIDDEN_STORAGE_KEY = "smart-invest-values-hidden";

type UiState = {
  themeMode: ThemeMode;
  sidebarCollapsed: boolean;
  /** When true, monetary and position amounts are masked across the app. */
  valuesHidden: boolean;
};

function readStoredTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }
  return localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
}

function readStoredValuesHidden(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return localStorage.getItem(VALUES_HIDDEN_STORAGE_KEY) === "1";
}

const initialState: UiState = {
  themeMode: readStoredTheme(),
  sidebarCollapsed: false,
  valuesHidden: readStoredValuesHidden(),
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
    setValuesHidden(state, action: PayloadAction<boolean>) {
      state.valuesHidden = action.payload;
    },
    toggleValuesHidden(state) {
      state.valuesHidden = !state.valuesHidden;
    },
  },
});

export const {
  hydrateTheme,
  setThemeMode,
  toggleThemeMode,
  toggleSidebarCollapsed,
  setValuesHidden,
  toggleValuesHidden,
} = uiSlice.actions;
export default uiSlice.reducer;