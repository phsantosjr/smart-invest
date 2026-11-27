import { useState } from "react";
import { Link } from "react-router-dom";

import { MaterialIcon } from "../../../components/MaterialIcon";
import { getErrorMessage } from "../../../services/api";
import { syncMarketQuotes } from "../../../services/marketQuoteSyncApi";

type MarketQuoteSyncButtonProps = {
  onSynced?: () => void;
};

export function MarketQuoteSyncButton({ onSynced }: MarketQuoteSyncButtonProps) {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSync = async () => {
    setLoading(true);
    setError(null);
    setFeedback(null);
    try {
      const result = await syncMarketQuotes();
      const failed =
        result.failed_tickers.length > 0
          ? ` Falhas: ${result.failed_tickers.join(", ")}.`
          : "";
      setFeedback(
        `${result.updated_count} cotação(ões) atualizada(s) via ${result.providers_used ?? result.provider}.${failed}`,
      );
      onSynced?.();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-space-xs">
        <button
          type="button"
          disabled={loading}
          onClick={() => void handleSync()}
          className="flex h-9 items-center gap-space-xs rounded bg-surface-container px-space-md text-xs font-medium text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-60"
        >
          <MaterialIcon
            name={loading ? "hourglass_empty" : "cloud_download"}
            size={18}
            className={loading ? "animate-pulse" : undefined}
          />
          <span>{loading ? "Atualizando…" : "Atualizar cotações"}</span>
        </button>
        <Link
          to="/market-quotes/logs"
          className="flex h-9 w-9 items-center justify-center rounded bg-surface-container text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
          aria-label="Ver logs de cotações"
          title="Logs de cotações"
        >
          <MaterialIcon name="history" size={18} />
        </Link>
      </div>
      {feedback ? (
        <p className="max-w-xs text-right text-[10px] text-on-surface-variant">{feedback}</p>
      ) : null}
      {error ? (
        <p role="alert" className="max-w-xs text-right text-[10px] text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}