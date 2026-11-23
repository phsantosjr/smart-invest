import { useLayoutEffect, type PropsWithChildren } from "react";

import { THEME_STORAGE_KEY, type ThemeMode } from "../features/ui/uiSlice";
import { useAppSelector } from "./hooks";

function applyThemeClass(mode: ThemeMode) {
  document.documentElement.classList.toggle("dark", mode === "dark");
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const themeMode = useAppSelector((state) => state.ui.themeMode);

  useLayoutEffect(() => {
    applyThemeClass(themeMode);
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
  }, [themeMode]);

  return children;
}
