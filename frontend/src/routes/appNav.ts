export type AppNavItem = {
  path: string;
  label: string;
  icon: string;
  end?: boolean;
};

export const appNavItems: AppNavItem[] = [
  { path: "/portfolio", label: "Dashboard / Carteira", icon: "dashboard", end: true },
  { path: "/transactions", label: "Lançamentos", icon: "sync_alt", end: true },
  { path: "/dividends", label: "Dividendos", icon: "paid", end: true },
  { path: "/assets", label: "Ativos", icon: "inventory_2" },
  { path: "/fixed-income", label: "Renda Fixa", icon: "trending_up" },
  { path: "/imports/brokerage-note", label: "Importar PDF / B3", icon: "upload_file" },
  { path: "/household", label: "Família", icon: "group" },
  { path: "/accounts", label: "Contas & Instituições", icon: "account_balance" },
];