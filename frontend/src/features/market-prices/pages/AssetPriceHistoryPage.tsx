import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { MaterialIcon } from "../../../components/MaterialIcon";
import { getErrorMessage } from "../../../services/api";
import { fetchAsset } from "../../../services/assetsApi";
import {
  fetchMarketPriceHistory,
  type MarketPriceRecord,
} from "../../../services/marketPricesApi";
import type { Asset } from "../../../types/assets";
import { assetTypeLabel } from "../../transactions/utils/assetDisplay";
import { AssetPriceLineChart } from "../components/AssetPriceLineChart";
import { CurrentPriceSummary } from "../components/CurrentPriceSummary";
import { MarketPriceHistoryTable } from "../components/MarketPriceHistoryTable";
import { sortPricesByQuotedAtDesc } from "../utils/priceHistory";

export function AssetPriceHistoryPage() {
  const { assetId } = useParams<{ assetId: string }>();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [records, setRecords] = useState<MarketPriceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!assetId) {
      setError("Ativo não informado.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [assetRow, prices] = await Promise.all([
        fetchAsset(assetId),
        fetchMarketPriceHistory(assetId),
      ]);
      setAsset(assetRow);
      setRecords(sortPricesByQuotedAtDesc(prices));
    } catch (err) {
      setError(getErrorMessage(err));
      setAsset(null);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  useEffect(() => {
    void load();
  }, [load]);

  const title = useMemo(() => {
    if (!asset) {
      return "Histórico de preços";
    }
    const ticker = asset.ticker?.trim();
    return ticker ? `${ticker} · ${asset.name}` : asset.name;
  }, [asset]);

  const tickerLabel = asset?.ticker?.trim() || asset?.name || "Ativo";

  return (
    <div className="flex w-full max-w-5xl flex-col gap-space-md pb-space-xl">
      <header className="flex flex-col gap-space-sm sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            to="/assets"
            className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-on-surface-variant hover:text-on-surface"
          >
            <MaterialIcon name="arrow_back" size={16} />
            Voltar aos ativos
          </Link>
          <h1 className="font-headline text-2xl font-semibold text-on-surface">{title}</h1>
          {asset ? (
            <p className="mt-0.5 text-xs text-on-surface-variant">
              {assetTypeLabel(asset.asset_type)} · cada linha é uma captura ou lançamento manual
            </p>
          ) : null}
        </div>
      </header>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-error/30 bg-error-container/20 px-space-md py-space-sm text-sm text-error"
        >
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-on-surface-variant">Carregando histórico…</p>
      ) : asset ? (
        <>
          <section className="rounded-lg bg-surface-container-low p-space-lg shadow-sm">
            <CurrentPriceSummary records={records} ticker={asset.ticker} large />
          </section>

          <AssetPriceLineChart records={records} tickerLabel={tickerLabel} />

          <section className="space-y-space-sm">
            <h2 className="text-sm font-semibold text-on-surface">
              Todas as capturas ({records.length})
            </h2>
            <MarketPriceHistoryTable rows={records} />
          </section>
        </>
      ) : null}
    </div>
  );
}