import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { MaterialIcon } from "../../../components/MaterialIcon";
import { getErrorMessage } from "../../../services/api";
import type { Asset } from "../../../types/assets";
import { CurrentPriceSummary } from "../../market-prices/components/CurrentPriceSummary";
import { MarketPriceHistoryTable } from "../../market-prices/components/MarketPriceHistoryTable";
import {
  assetPriceHistoryPath,
  sortPricesByQuotedAtDesc,
} from "../../market-prices/utils/priceHistory";
import {
  fetchMarketPriceHistory,
  type MarketPriceRecord,
} from "../../../services/marketPricesApi";

const MARKET_TYPES = new Set(["STOCK", "FII", "FUND"]);

type AssetMarketPricePanelProps = {
  asset: Asset;
};

const PREVIEW_LIMIT = 10;

export function AssetMarketPricePanel({ asset }: AssetMarketPricePanelProps) {
  const [records, setRecords] = useState<MarketPriceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eligible = MARKET_TYPES.has(asset.asset_type) && Boolean(asset.ticker?.trim());

  useEffect(() => {
    if (!eligible) {
      setRecords([]);
      setError(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const rows = await fetchMarketPriceHistory(asset.id);
        if (!cancelled) {
          setRecords(sortPricesByQuotedAtDesc(rows));
        }
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err));
          setRecords([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [asset.id, eligible]);

  if (!eligible) {
    return (
      <p className="mt-space-sm text-xs text-on-surface-variant">
        Cotações de mercado aplicam-se a ativos com ticker (ações, FIIs, ETFs/BDRs). Renda fixa usa
        marcação própria.
      </p>
    );
  }

  const preview = records.slice(0, PREVIEW_LIMIT);

  return (
    <div className="mt-space-md space-y-space-md border-t border-outline-variant/25 pt-space-md">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
        Cotação de mercado
      </h3>
      {loading ? <p className="text-xs text-on-surface-variant">Carregando cotações…</p> : null}
      {error ? (
        <p role="alert" className="text-xs text-error">
          {error}
        </p>
      ) : null}
      {!loading && !error ? (
        <>
          <CurrentPriceSummary records={records} ticker={asset.ticker} />
          <div>
            <p className="mb-2 text-[11px] font-medium text-on-surface-variant">
              Últimas {PREVIEW_LIMIT} capturas
            </p>
            <MarketPriceHistoryTable rows={preview} compact />
          </div>
          {records.length > 0 ? (
            <Link
              to={assetPriceHistoryPath(asset.id)}
              className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-surface-container px-3 py-2 text-xs font-semibold text-secondary hover:bg-surface-container-high"
            >
              <MaterialIcon name="show_chart" size={16} />
              Ver histórico e gráfico
            </Link>
          ) : null}
        </>
      ) : null}
    </div>
  );
}