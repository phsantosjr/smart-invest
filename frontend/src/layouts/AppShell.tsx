import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "../app/hooks";
import { AppHeader } from "../components/shell/AppHeader";
import { AppSidebar } from "../components/shell/AppSidebar";
import { loadCurrentUser } from "../features/auth/authSlice";

const breadcrumbByPath: Record<string, string> = {
  "/portfolio": "Consolidado",
  "/transactions": "Lançamentos",
  "/transactions/new": "Novo lançamento",
  "/dividends": "Dividendos",
  "/projection": "Projeção",
  "/fixed-income": "Renda fixa",
  "/imports/brokerage-note": "Importar nota",
  "/household": "Família",
  "/accounts": "Contas & Instituições",
  "/assets": "Ativos",
};

export function AppShell() {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const currentUser = useAppSelector((state) => state.auth.currentUser);
  const sidebarCollapsed = useAppSelector((state) => state.ui.sidebarCollapsed);

  useEffect(() => {
    if (accessToken && !currentUser) {
      void dispatch(loadCurrentUser());
    }
  }, [accessToken, currentUser, dispatch]);

  const breadcrumb =
    breadcrumbByPath[location.pathname] ??
    (location.pathname.startsWith("/fixed-income/") ? "Detalhe renda fixa" : "App");

  return (
    <div className="min-h-screen bg-surface font-sans text-sm text-on-surface antialiased selection:bg-primary-container selection:text-on-primary-container">
      <AppSidebar />
      <div className={sidebarCollapsed ? "pl-16" : "pl-64"}>
        <AppHeader breadcrumb={breadcrumb} sidebarCollapsed={sidebarCollapsed} />
        <main className="relative min-h-screen w-full bg-surface px-space-lg pb-space-xl pt-16">
          <Outlet />
        </main>
      </div>
    </div>
  );
}