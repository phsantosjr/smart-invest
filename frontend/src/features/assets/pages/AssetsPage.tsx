import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { MaterialIcon } from "../../../components/MaterialIcon";
import type { Asset, AssetType, AssetWrite } from "../../../types/assets";
import {
  assetTypeLabel,
  buildAssetDetailRows,
} from "../../transactions/utils/assetDisplay";
import {
  clearAssetsError,
  createAsset,
  loadAssetsPage,
  selectAsset,
  updateAsset,
  type AssetTableFilter,
} from "../assetsSlice";

const TYPE_TABS: { id: AssetTableFilter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "STOCK", label: "Ações" },
  { id: "FII", label: "FIIs" },
  { id: "TREASURY", label: "Tesouro" },
  { id: "FIXED_INCOME", label: "Renda fixa" },
  { id: "FUND", label: "Fundos" },
];

const ASSET_TYPES: AssetType[] = [
  "STOCK",
  "FII",
  "TREASURY",
  "FIXED_INCOME",
  "FUND",
];

const fieldClass =
  "rounded border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface outline-none focus:border-secondary focus:ring-1 focus:ring-secondary";

export function AssetsPage() {
  const dispatch = useAppDispatch();
  const { items, selectedId, listStatus, mutationStatus, error } = useAppSelector(
    (state) => state.assets,
  );

  const [tableFilter, setTableFilter] = useState<AssetTableFilter>("all");
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [assetType, setAssetType] = useState<AssetType>("STOCK");
  const [ticker, setTicker] = useState("");
  const [issuer, setIssuer] = useState("");
  const [indexer, setIndexer] = useState("");
  const [maturityDate, setMaturityDate] = useState("");

  const mutating = mutationStatus === "loading";
  const loadingList = listStatus === "loading" && items.length === 0;

  useEffect(() => {
    void dispatch(loadAssetsPage());
  }, [dispatch]);

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = { all: items.length };
    for (const item of items) {
      counts[item.asset_type] = (counts[item.asset_type] ?? 0) + 1;
    }
    return counts;
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    return items.filter((item) => {
      const matchesType = tableFilter === "all" || item.asset_type === tableFilter;
      const haystack = [item.ticker, item.name, item.issuer, item.indexer]
        .filter(Boolean)
        .join(" ")
        .toUpperCase();
      const matchesQuery = !q || haystack.includes(q);
      return matchesType && matchesQuery;
    });
  }, [items, query, tableFilter]);

  const resetFormFields = () => {
    setName("");
    setAssetType("STOCK");
    setTicker("");
    setIssuer("");
    setIndexer("");
    setMaturityDate("");
  };

  const openCreateForm = () => {
    setEditingId(null);
    resetFormFields();
    dispatch(clearAssetsError());
    setShowForm(true);
  };

  const openEditForm = (assetId: string) => {
    const asset = items.find((item) => item.id === assetId);
    if (!asset) {
      return;
    }
    setEditingId(asset.id);
    setName(asset.name);
    setAssetType(asset.asset_type);
    setTicker(asset.ticker ?? "");
    setIssuer(asset.issuer ?? "");
    setIndexer(asset.indexer ?? "");
    setMaturityDate(asset.maturity_date ?? "");
    dispatch(selectAsset(asset.id));
    dispatch(clearAssetsError());
    setShowForm(true);
  };

  const onCancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    dispatch(clearAssetsError());
  };

  const buildPayload = (): AssetWrite => ({
    name: name.trim(),
    asset_type: assetType,
    ticker: ticker.trim() || null,
    issuer: issuer.trim() || null,
    indexer: indexer.trim() || null,
    maturity_date: maturityDate.trim() || null,
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }
    const body = buildPayload();
    if (editingId) {
      void dispatch(updateAsset({ assetId: editingId, body })).then((result) => {
        if (updateAsset.fulfilled.match(result)) {
          setShowForm(false);
          setEditingId(null);
        }
      });
      return;
    }
    void dispatch(createAsset(body)).then((result) => {
      if (createAsset.fulfilled.match(result)) {
        setShowForm(false);
        resetFormFields();
      }
    });
  };

  const showRfFields =
    assetType === "FIXED_INCOME" || assetType === "TREASURY" || assetType === "FUND";
  const tickerRequired = assetType === "STOCK" || assetType === "FII";

  return (
    <div className="flex w-full flex-col gap-space-md pb-space-xl">
      <header className="flex flex-col gap-space-md lg:flex-row lg:items-center lg:justify-between">
        <h1 className="font-headline text-2xl font-semibold text-on-surface">Ativos</h1>
        <button
          type="button"
          onClick={openCreateForm}
          className="inline-flex items-center gap-space-xs rounded-lg bg-primary-container px-space-md py-2 text-xs font-semibold text-on-primary-fixed shadow-sm hover:opacity-90"
        >
          <MaterialIcon name="add" size={18} />
          Novo ativo
        </button>
      </header>

      {showForm ? (
        <section className="rounded-lg bg-surface-container-low p-space-md shadow-sm">
          <h2 className="text-base font-semibold text-on-surface">
            {editingId ? "Editar ativo" : "Cadastrar ativo"}
          </h2>
          <form className="mt-space-md grid gap-space-md lg:grid-cols-2" onSubmit={onSubmit}>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-semibold text-on-surface-variant">Nome</span>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-semibold text-on-surface-variant">Tipo</span>
              <select
                value={assetType}
                onChange={(e) => setAssetType(e.target.value as AssetType)}
                className={fieldClass}
              >
                {ASSET_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {assetTypeLabel(type)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="font-semibold text-on-surface-variant">
                Ticker{tickerRequired ? " *" : ""}
              </span>
              <input
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                required={tickerRequired}
                placeholder={tickerRequired ? "PETR4" : "Opcional"}
                className={fieldClass}
              />
            </label>
            {showRfFields ? (
              <>
                <label className="flex flex-col gap-1 text-xs">
                  <span className="font-semibold text-on-surface-variant">Emissor</span>
                  <input
                    value={issuer}
                    onChange={(e) => setIssuer(e.target.value)}
                    className={fieldClass}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs">
                  <span className="font-semibold text-on-surface-variant">Indexador</span>
                  <input
                    value={indexer}
                    onChange={(e) => setIndexer(e.target.value)}
                    className={fieldClass}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs">
                  <span className="font-semibold text-on-surface-variant">Vencimento</span>
                  <input
                    type="date"
                    value={maturityDate}
                    onChange={(e) => setMaturityDate(e.target.value)}
                    className={fieldClass}
                  />
                </label>
              </>
            ) : null}
            <div className="flex items-end gap-space-sm lg:col-span-2">
              <button
                type="submit"
                disabled={mutating}
                className="rounded-lg bg-primary-container px-space-md py-2 text-xs font-semibold text-on-primary-fixed disabled:opacity-60"
              >
                {mutating ? "..." : editingId ? "Salvar" : "Cadastrar"}
              </button>
              <button
                type="button"
                onClick={onCancelForm}
                className="rounded-lg px-3 py-2 text-xs text-on-surface-variant hover:bg-surface-container"
              >
                Cancelar
              </button>
            </div>
          </form>
          {error ? <p className="mt-space-md text-xs text-error">{error}</p> : null}
        </section>
      ) : null}

      <AssetsTableSection
        filtered={filtered}
        filterCounts={filterCounts}
        tableFilter={tableFilter}
        onFilter={setTableFilter}
        query={query}
        onQuery={setQuery}
        loadingList={loadingList}
        selected={selected}
        onSelect={(id) => dispatch(selectAsset(id))}
        onEdit={openEditForm}
        listError={!showForm ? error : null}
      />
    </div>
  );
}

function AssetsTableSection(props: {
  filtered: Asset[];
  filterCounts: Record<string, number>;
  tableFilter: AssetTableFilter;
  onFilter: (id: AssetTableFilter) => void;
  query: string;
  onQuery: (value: string) => void;
  loadingList: boolean;
  selected: Asset | null;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  listError: string | null;
}) {
  const {
    filtered,
    filterCounts,
    tableFilter,
    onFilter,
    query,
    onQuery,
    loadingList,
    selected,
    onSelect,
    onEdit,
    listError,
  } = props;

  return (
    <div className="grid gap-space-md lg:grid-cols-[minmax(0,1fr)_18rem]">
      <section className="rounded-lg bg-surface-container-low p-space-md shadow-sm">
        <div className="mb-space-md flex flex-col gap-space-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1">
            {TYPE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onFilter(tab.id)}
                className={[
                  "rounded px-space-sm py-1 text-[11px] font-semibold",
                  tableFilter === tab.id
                    ? "bg-primary-container text-on-primary-fixed"
                    : "text-on-surface-variant hover:text-on-surface",
                ].join(" ")}
              >
                {tab.label} ({filterCounts[tab.id === "all" ? "all" : tab.id] ?? 0})
              </button>
            ))}
          </div>
          <input
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Buscar…"
            className="h-8 w-full rounded border border-outline-variant/40 bg-surface px-3 text-xs sm:w-48"
          />
        </div>

        {listError ? <p className="mb-space-sm text-xs text-error">{listError}</p> : null}
        {loadingList ? (
          <p className="text-sm text-on-surface-variant">Carregando…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-on-surface-variant">Nenhum ativo cadastrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead>
                <tr className="border-b border-outline-variant/30 text-on-surface-variant">
                  <th className="py-2 pr-2">Ticker</th>
                  <th className="py-2 pr-2">Nome</th>
                  <th className="py-2 pr-2">Tipo</th>
                  <th className="py-2 pr-2">Emissor</th>
                  <th className="py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {filtered.map((asset) => {
                  const isSelected = selected?.id === asset.id;
                  return (
                    <tr
                      key={asset.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelect(asset.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onSelect(asset.id);
                        }
                      }}
                      className={[
                        "cursor-pointer transition-colors hover:bg-surface-container/60",
                        isSelected ? "bg-surface-container/80" : undefined,
                      ].join(" ")}
                    >
                      <td className="py-2 pr-2 font-semibold tabular-nums">
                        {asset.ticker ?? "—"}
                      </td>
                      <td className="py-2 pr-2">{asset.name}</td>
                      <td className="py-2 pr-2">{assetTypeLabel(asset.asset_type)}</td>
                      <td className="py-2 pr-2 text-on-surface-variant">
                        {asset.issuer ?? "—"}
                      </td>
                      <td className="py-2 text-right">
                        <Link
                          to={`/transactions/new?assetId=${asset.id}`}
                          onClick={(event) => event.stopPropagation()}
                          className="mr-2 inline-flex items-center gap-0.5 font-semibold text-secondary hover:underline"
                        >
                          <MaterialIcon name="sync_alt" size={14} />
                          Lançar
                        </Link>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onEdit(asset.id);
                          }}
                          className="text-on-surface-variant hover:text-on-surface"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <aside className="rounded-lg bg-surface-container-low p-space-md shadow-sm">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
          Ficha do ativo
        </h2>
        {!selected ? (
          <p className="mt-space-md text-sm text-on-surface-variant">
            Selecione um ativo na tabela.
          </p>
        ) : (
          <DetailReport asset={selected} />
        )}
      </aside>
    </div>
  );
}

function DetailReport({ asset }: { asset: Asset }) {
  const rows = buildAssetDetailRows(asset);
  const rfReport =
    asset.asset_type === "FIXED_INCOME" || asset.asset_type === "TREASURY";

  return (
    <div className="mt-space-md space-y-space-md">
      <dl className="space-y-2 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[6.5rem_1fr] gap-2">
            <dt className="text-on-surface-variant">{row.label}</dt>
            <dd className="font-medium text-on-surface">{row.value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-col gap-2">
        <Link
          to={`/transactions/new?assetId=${asset.id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-secondary hover:underline"
        >
          <MaterialIcon name="sync_alt" size={16} />
          Novo lançamento
        </Link>
        {rfReport ? (
          <Link
            to={`/fixed-income/${asset.id}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-secondary hover:underline"
          >
            <MaterialIcon name="description" size={16} />
            Relatório renda fixa
          </Link>
        ) : null}
        <Link
          to="/portfolio"
          className="inline-flex items-center gap-1 text-xs text-on-surface-variant hover:text-on-surface"
        >
          <MaterialIcon name="dashboard" size={16} />
          Ver na carteira
        </Link>
      </div>
    </div>
  );
}