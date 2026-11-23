import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { ThemeToggle } from "../../../components/ThemeToggle";
import { login, verify2fa } from "../authSlice";

export function LoginPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { phase, status, error, accessToken } = useAppSelector((state) => state.auth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");

  useEffect(() => {
    if (accessToken) {
      navigate("/portfolio", { replace: true });
    }
  }, [accessToken, navigate]);

  const onSubmitCredentials = (event: FormEvent) => {
    event.preventDefault();
    void dispatch(login({ email, password }));
  };

  const onSubmitTotp = (event: FormEvent) => {
    event.preventDefault();
    void dispatch(verify2fa(totpCode));
  };

  const loading = status === "loading";

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-surface px-4 dark:bg-surface-dark">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm rounded-lg border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-card-dark">
        <h1 className="mb-6 text-lg font-semibold text-primary">Entrar</h1>

        {phase === "credentials" ? (
          <form className="flex flex-col gap-4" onSubmit={onSubmitCredentials}>
            <label className="flex flex-col gap-1 text-sm">
              E-mail
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded border border-black/15 px-3 py-2 dark:border-white/20 dark:bg-surface-dark"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Senha
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded border border-black/15 px-3 py-2 dark:border-white/20 dark:bg-surface-dark"
              />
            </label>
            {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {loading ? "..." : "Entrar"}
            </button>
          </form>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={onSubmitTotp}>
            <label className="flex flex-col gap-1 text-sm">
              Código 2FA
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                required
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                className="rounded border border-black/15 px-3 py-2 tabular-nums dark:border-white/20 dark:bg-surface-dark"
              />
            </label>
            {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
            <button
              type="submit"
              disabled={loading || totpCode.length !== 6}
              className="rounded bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {loading ? "..." : "Confirmar"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}