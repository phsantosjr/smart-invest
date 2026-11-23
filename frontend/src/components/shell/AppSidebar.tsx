import { NavLink } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { logout } from "../../features/auth/authSlice";
import { toggleSidebarCollapsed, toggleThemeMode } from "../../features/ui/uiSlice";
import { appNavItems } from "../../routes/appNav";
import { shortDisplayName, userInitials } from "../../utils/userDisplay";
import { MaterialIcon } from "../MaterialIcon";

export function AppSidebar() {
  const dispatch = useAppDispatch();
  const sidebarCollapsed = useAppSelector((state) => state.ui.sidebarCollapsed);
  const themeMode = useAppSelector((state) => state.ui.themeMode);
  const currentUser = useAppSelector((state) => state.auth.currentUser);

  const displayName = currentUser ? shortDisplayName(currentUser.name) : "—";
  const initials = currentUser ? userInitials(currentUser.name) : "?";
  const ownerLabel = currentUser?.is_household_owner ? "Titular" : "Membro";

  return (
    <aside
      className={`fixed left-0 top-0 z-50 flex h-full flex-col justify-between bg-surface-container-low transition-[width] duration-200 select-none ${
        sidebarCollapsed ? "w-16" : "w-64"
      }`}
    >
      <div className="flex flex-col">
        <div className="flex h-16 items-center gap-space-sm px-space-lg">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary-container">
            <MaterialIcon name="pie_chart" size={20} className="text-primary" />
          </div>
          {!sidebarCollapsed ? (
            <div className="flex min-w-0 flex-col">
              <span className="font-headline text-base font-semibold leading-none tracking-tight text-on-surface">
                Portfólio
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                B3 & Household
              </span>
            </div>
          ) : null}
        </div>

        <nav className="flex flex-col gap-space-xs px-space-md py-space-sm">
          {appNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              title={item.label}
              className={({ isActive }) =>
                [
                  "flex items-center gap-space-md rounded px-space-md py-space-sm text-sm transition-colors",
                  sidebarCollapsed ? "justify-center px-2" : "",
                  isActive
                    ? "bg-surface-container-high font-semibold text-on-surface"
                    : "font-normal text-on-surface-variant hover:bg-surface-container hover:text-on-surface",
                ].join(" ")
              }
            >
              <MaterialIcon name={item.icon} size={18} className="shrink-0" />
              {!sidebarCollapsed ? <span>{item.label}</span> : null}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="flex flex-col gap-space-sm p-space-md">
        {!sidebarCollapsed ? (
          <div className="flex items-center justify-between rounded bg-surface-container p-space-sm">
            <div className="flex min-w-0 items-center gap-space-sm overflow-hidden">
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary-container text-[11px] font-semibold text-on-secondary">
                {initials}
              </div>
              <div className="min-w-0 truncate">
                <p className="truncate text-xs font-semibold text-on-surface">
                  {displayName} {currentUser?.is_household_owner ? "(Admin)" : ""}
                </p>
                <p className="truncate text-[11px] text-on-surface-variant">{ownerLabel}</p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Alternar membro"
              className="shrink-0 p-space-xs text-on-surface-variant transition-colors hover:text-on-surface"
            >
              <MaterialIcon name="unfold_more" size={18} />
            </button>
          </div>
        ) : null}

        <div
          className={`flex items-center text-on-surface-variant ${
            sidebarCollapsed ? "flex-col gap-1" : "justify-between px-space-xs pt-space-xs"
          }`}
        >
          <button
            type="button"
            aria-label={themeMode === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
            onClick={() => dispatch(toggleThemeMode())}
            className="rounded p-space-xs transition-colors hover:bg-surface-container hover:text-on-surface"
          >
            <MaterialIcon name={themeMode === "dark" ? "light_mode" : "dark_mode"} size={18} />
          </button>
          <button
            type="button"
            aria-label={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
            onClick={() => dispatch(toggleSidebarCollapsed())}
            className="rounded p-space-xs transition-colors hover:bg-surface-container hover:text-on-surface"
          >
            <MaterialIcon name={sidebarCollapsed ? "last_page" : "first_page"} size={18} />
          </button>
          <button
            type="button"
            aria-label="Sair"
            onClick={() => dispatch(logout())}
            className="rounded p-space-xs transition-colors hover:bg-surface-container hover:text-on-surface"
          >
            <MaterialIcon name="logout" size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}