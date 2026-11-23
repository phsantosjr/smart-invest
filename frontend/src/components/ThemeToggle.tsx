import { useAppDispatch, useAppSelector } from "../app/hooks";
import { toggleThemeMode } from "../features/ui/uiSlice";
import { Button } from "./Button";

function MoonIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M21 14.5A9 9 0 1 1 9.5 3 7 7 0 0 0 21 14.5z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

export function ThemeToggle() {
  const dispatch = useAppDispatch();
  const themeMode = useAppSelector((state) => state.ui.themeMode);
  const isDark = themeMode === "dark";

  return (
    <Button
      variant="ghost"
      className="inline-flex min-h-11 cursor-pointer items-center gap-2 border border-black/15 px-3 dark:border-white/20"
      aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
      aria-pressed={isDark}
      onClick={() => dispatch(toggleThemeMode())}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
      <span>{isDark ? "Claro" : "Escuro"}</span>
    </Button>
  );
}
