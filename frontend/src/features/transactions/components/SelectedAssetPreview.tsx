import type { Asset } from "../../../types/assets";
import { assetTypeLabel } from "../utils/assetDisplay";

type SelectedAssetPreviewProps = {
  asset: Asset;
};

function assetMonogram(asset: Asset): string {
  const source = asset.ticker ?? asset.name;
  const letters = source.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase();
  return letters || "—";
}

export function SelectedAssetPreview({ asset }: SelectedAssetPreviewProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-outline-variant/30 bg-surface-dim/60 p-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary-fixed/30 bg-primary-container/15 font-mono-financial text-xs font-bold text-primary-fixed">
          {assetMonogram(asset)}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono-financial text-xs font-bold text-on-surface">
              {asset.ticker ?? asset.name}
            </span>
            <span className="text-[10px] text-on-surface-variant">
              {assetTypeLabel(asset.asset_type)}
            </span>
          </div>
          <p className="truncate text-[11px] text-on-surface-variant">{asset.name}</p>
        </div>
      </div>
    </div>
  );
}