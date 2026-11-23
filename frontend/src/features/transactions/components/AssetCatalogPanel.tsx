import { Link } from "react-router-dom";

import { MaterialIcon } from "../../../components/MaterialIcon";
import type { Asset } from "../../../types/assets";
import {
  assetExpectsTicker,
  buildAssetDetailRows,
} from "../utils/assetDisplay";

type AssetCatalogPanelProps = {
  asset: Asset | null;
};

export function AssetCatalogPanel({ asset }: AssetCatalogPanelProps) {
  if (!asset) {
    return null;
  }

  const rows = buildAssetDetailRows(asset);
  const showFixedIncomeLink =
    asset.asset_type === "FIXED_INCOME" || asset.asset_type === "TREASURY";

  return (
    <aside className="rounded-md border border-outline-variant/30 bg-surface-container/40 p-space-md">
      <div className="mb-space-sm flex items-center justify-between gap-space-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
          Catálogo de ativo
        </h2>
        {showFixedIncomeLink ? (
          <Link
            to={`/fixed-income/${asset.id}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-secondary hover:underline"
          >
            <MaterialIcon name="description" size={16} />
            Relatório RF
          </Link>
        ) : null}
      </div>
      <dl className="grid gap-2 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[7rem_1fr] gap-2">
            <dt className="text-on-surface-variant">{row.label}</dt>
            <dd className="font-medium text-on-surface">{row.value}</dd>
          </div>
        ))}
      </dl>
      {assetExpectsTicker(asset.asset_type) && !asset.ticker ? (
        <p role="status" className="mt-space-sm text-xs text-error">
          Este ativo de renda variável está sem ticker no catálogo. Corrija no painel admin.
        </p>
      ) : null}
    </aside>
  );
}