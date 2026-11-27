import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { ThemeProvider } from "./app/ThemeProvider";
import { AccountsPage } from "./features/accounts/pages/AccountsPage";
import { AssetsPage } from "./features/assets/pages/AssetsPage";
import { LoginPage } from "./features/auth/pages/LoginPage";
import { PortfolioPage } from "./features/portfolio/pages/PortfolioPage";
import { FixedIncomePage } from "./features/fixed-income/pages/FixedIncomePage";
import { ComingSoonPage } from "./features/shared/pages/ComingSoonPage";
import { DividendsPage } from "./features/dividends/pages/DividendsPage";
import { ProjectionPage } from "./features/projection/pages/ProjectionPage";
import { NewTransactionPage } from "./features/transactions/pages/NewTransactionPage";
import { TransactionsPage } from "./features/transactions/pages/TransactionsPage";
import { AppShell } from "./layouts/AppShell";
import { ProtectedRoute } from "./routes/ProtectedRoute";

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="/portfolio" element={<PortfolioPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/transactions/new" element={<NewTransactionPage />} />
            <Route path="/dividends" element={<DividendsPage />} />
            <Route path="/projection" element={<ProjectionPage />} />
            <Route path="/fixed-income" element={<FixedIncomePage />} />
            <Route
              path="/fixed-income/:assetId"
              element={<ComingSoonPage title="Detalhe renda fixa" />}
            />
            <Route
              path="/imports/brokerage-note"
              element={<ComingSoonPage title="Importar nota de corretagem" />}
            />
            <Route path="/household" element={<ComingSoonPage title="Família" />} />
            <Route path="/accounts" element={<AccountsPage />} />
            <Route path="/assets" element={<AssetsPage />} />
          </Route>
          <Route path="/" element={<Navigate to="/portfolio" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}