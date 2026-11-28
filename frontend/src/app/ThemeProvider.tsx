import { useLayoutEffect, type PropsWithChildren } from "react";

import {
  THEME_STORAGE_KEY,
  VALUES_HIDDEN_STORAGE_KEY,
  type ThemeMode,
} from "../features/ui/uiSlice";
import { useAppSelector } from "./hooks";

function applyThemeClass(mode: ThemeMode) {
  document.documentElement.classList.toggle("dark", mode === "dark");
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const themeMode = useAppSelector((state) => state.ui.themeMode);
  const valuesHidden = useAppSelector((state) => state.ui.valuesHidden);

  useLayoutEffect(() => {
    applyThemeClass(themeMode);
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [themeMode]);

  useLayoutEffect(() => {
    localStorage.setItem(VALUES_HIDDEN_STORAGE_KEY, valuesHidden ? "1" : "0");
  }, [valuesHidden]);

  return children;
}
