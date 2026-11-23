import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { MaterialIcon } from "../../../components/MaterialIcon";
import { TextField } from "../../../components/TextField";
import { getErrorMessage } from "../../../services/api";
import * as accountsApi from "../../../services/accountsApi";
import * as portfolioApi from "../../../services/portfolioApi";
import * as fixedIncomeValuationsApi from "../../../services/fixedIncomeValuationsApi";
import * as incomeEventsApi from "../../../services/incomeEventsApi";
import * as transactionsApi from "../../../services/transactionsApi";
import type { Asset, AssetType } from "../../../types/assets";
import type { BrokerageAccount } from "../../../types/accounts";
import type { IncomeType } from "../../../types/incomeEvents";
import { TAX_EXEMPT_INCOME_TYPES } from "../../../types/incomeEvents";
import type { PortfolioPosition } from "../../../types/portfolioApi";
import type { OperationMode, TransactionListItem } from "../../../types/transactions";
import { formatBrl } from "../../../utils/money";
import { loadPortfolioPage } from "../../portfolio/portfolioSlice";
import { FixedIncomeValuationFormFields } from "../components/FixedIncomeValuationFormFields";
import { IncomeEventFormFields } from "../components/IncomeEventFormFields";
import { RecentTransactionsSidebar } from "../components/RecentTransactionsSidebar";
import { SelectedAssetPreview } from "../components/SelectedAssetPreview";
import { TransactionOperationSelector } from "../components/TransactionOperationSelector";
import { TransactionSummaryPanel } from "../components/TransactionSummaryPanel";
import {
  ASSET_TYPE_LABEL,
  assetTypeLabel,
  formatAssetOptionLabel,
  formatAssetSearchText,
} from "../utils/assetDisplay";
import {
  computeIncomeNetPreview,
  suggestedIncomeType,
} from "../utils/incomePreview";
import {
  computeTransactionTotal,
  computeTransactionTotalBreakdown,
  projectAveragePriceAfterBuy,
} from "../utils/transactionPreview";

type AssetTypeFilter = "all" | AssetType;

const TYPE_FILTERS: { id: AssetTypeFilter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "STOCK", label: ASSET_TYPE_LABEL.STOCK },
  { id: "FII", label: ASSET_TYPE_LABEL.FII },
  { id: "TREASURY", label: ASSET_TYPE_LABEL.TREASURY },
  { id: "FIXED_INCOME", label: ASSET_TYPE_LABEL.FIXED_INCOME },
  { id: "FUND", label: ASSET_TYPE_LABEL.FUND },
];

const FIXED_INCOME_ASSET_TYPES = new Set<AssetType>(["FIXED_INCOME", "TREASURY"]);

const selectFieldClassName =
  "w-full cursor-pointer appearance-none rounded-xl border border-outline-variant/40 bg-surface-container-low py-2.5 pr-9 pl-10 text-xs text-on-surface transition-all focus:border-primary-fixed focus:ring-2 focus:ring-primary-fixed/40 focus:outline-none";

function isoDateOffset(daysFromToday: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
}

export function NewTransactionPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<BrokerageAccount[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<TransactionListItem[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [brokerageAccountId, setBrokerageAccountId] = useState("");
  const [assetId, setAssetId] = useState("");
  const [assetTypeFilter, setAssetTypeFilter] = useState<AssetTypeFilter>("all");
  const [assetQuery, setAssetQuery] = useState("");
  const [operationMode, setOperationMode] = useState<OperationMode>("BUY");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [fees, setFees] = useState("0");
  const [transactionDate, setTransactionDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [incomeType, setIncomeType] = useState<IncomeType>("DIVIDEND");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [exDate, setExDate] = useState("");
  const [grossAmount, setGrossAmount] = useState("");
  const [taxWithheld, setTaxWithheld] = useState("0");
  const [valuationDate, setValuationDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [appliedValue, setAppliedValue] = useState("");
  const [currentValue, setCurrentValue] = useState("");

  const currentUser = useAppSelector((state) => state.auth.currentUser);
  const [searchParams] = useSearchParams();
  const preselectedAssetId = searchParams.get("assetId");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [accountList, assetList, portfolio, transactions] = await Promise.all([
          accountsApi.fetchBrokerageAccounts(),
          portfolioApi.fetchAssets(),
          portfolioApi.fetchPortfolio("self"),
          transactionsApi.fetchTransactions({ page: 1, page_size: 3 }),
        ]);
        if (!active) {
          return;
        }
        setAccounts(accountList);
        setAssets(assetList);
        setPositions(portfolio.positions);
        setRecentTransactions(transactions.items);
        if (accountList[0]) {
          setBrokerageAccountId(accountList[0].id);
        }
        const preferred = preselectedAssetId
          ? assetList.find((asset) => asset.id === preselectedAssetId)?.id
          : undefined;
        if (preferred) {
          const preferredAsset = assetList.find((asset) => asset.id === preferred);
          setAssetId(preferred);
          if (preferredAsset) {
            setAssetTypeFilter("all");
            setAssetQuery(preferredAsset.ticker ?? preferredAsset.name);
          }
        } else if (assetList[0]) {
          setAssetId(assetList[0].id);
        }
      } catch (loadError) {
        if (active) {
          setError(getErrorMessage(loadError));
        }
      } finally {
        if (active) {
          setLoading(false);
          setRecentLoading(false);
        }
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [preselectedAssetId]);

  useEffect(() => {
    if (operationMode === "FIXED_INCOME") {
      setAssetTypeFilter("all");
    }
  }, [operationMode]);

  const filteredAssets = useMemo(() => {
    const query = assetQuery.trim().toUpperCase();
    return assets.filter((asset) => {
      if (operationMode === "FIXED_INCOME" && !FIXED_INCOME_ASSET_TYPES.has(asset.asset_type)) {
        return false;
      }
      const matchesType = assetTypeFilter === "all" || asset.asset_type === assetTypeFilter;
      const matchesQuery = !query || formatAssetSearchText(asset).includes(query);
      return matchesType && matchesQuery;
    });
  }, [assetQuery, assetTypeFilter, assets, operationMode]);

  useEffect(() => {
    if (filteredAssets.length === 0) {
      return;
    }
    if (!filteredAssets.some((asset) => asset.id === assetId)) {
      setAssetId(filteredAssets[0].id);
    }
  }, [assetId, filteredAssets]);

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === assetId) ?? null,
    [assetId, assets],
  );

  const selectedAccount = useMemo(
    () => accounts.find((account) => account.id === brokerageAccountId) ?? null,
    [accounts, brokerageAccountId],
  );

  const positionForAsset = useMemo(() => {
    if (!brokerageAccountId || !assetId) {
      return undefined;
    }
    return positions.find(
      (position) =>
        position.brokerage_account_id === brokerageAccountId && position.asset_id === assetId,
    );
  }, [assetId, brokerageAccountId, positions]);

  useEffect(() => {
    if (selectedAsset) {
      setIncomeType(suggestedIncomeType(selectedAsset.asset_type));
    }
  }, [selectedAsset]);

  const custodyQuantity = useMemo(() => {
    if (operationMode !== "SELL" || !brokerageAccountId || !assetId) {
      return null;
    }
    return positionForAsset?.quantity ?? "0";
  }, [assetId, brokerageAccountId, operationMode, positionForAsset]);

  const incomePreview = useMemo(
    () => computeIncomeNetPreview(incomeType, grossAmount, taxWithheld),
    [grossAmount, incomeType, taxWithheld],
  );

  const totalPreview = useMemo(() => {
    if (operationMode === "FIXED_INCOME") {
      const parsed = Number(currentValue.replace(",", ".").trim());
      return Number.isFinite(parsed) && parsed > 0 ? formatBrl(parsed) : null;
    }
    if (operationMode === "INCOME") {
      return incomePreview.net != null ? formatBrl(incomePreview.net) : null;
    }
    return computeTransactionTotal(operationMode, quantity, unitPrice, fees);
  }, [
    currentValue,
    fees,
    grossAmount,
    incomePreview.net,
    operationMode,
    quantity,
    taxWithheld,
    unitPrice,
  ]);

  const totalBreakdown = useMemo(() => {
    if (operationMode === "FIXED_INCOME") {
      return "Marcação manual de saldo bruto";
    }
    if (operationMode === "INCOME") {
      return incomePreview.label;
    }
    return computeTransactionTotalBreakdown(operationMode, quantity, unitPrice, fees);
  }, [fees, grossAmount, incomePreview.label, operationMode, quantity, taxWithheld, unitPrice]);

  const averageProjection = useMemo(() => {
    if (operationMode !== "BUY" || !selectedAsset) {
      return null;
    }
    const ticker = selectedAsset.ticker ?? selectedAsset.name;
    return projectAveragePriceAfterBuy(
      positionForAsset,
      quantity,
      unitPrice,
      fees,
      ticker,
    );
  }, [fees, operationMode, positionForAsset, quantity, selectedAsset, unitPrice]);

  const institutionSummaryLabel = selectedAccount
    ? `${selectedAccount.institution.name} — C/C ${selectedAccount.account_number}`
    : null;

  const resetTradeFields = useCallback(() => {
    setQuantity("");
    setUnitPrice("");
    setFees("0");
    setTransactionDate(new Date().toISOString().slice(0, 10));
    setAssetQuery("");
  }, []);

  const resetIncomeFields = useCallback(() => {
    setGrossAmount("");
    setTaxWithheld("0");
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setExDate("");
    setAssetQuery("");
  }, []);

  const resetFixedIncomeFields = useCallback(() => {
    setAppliedValue("");
    setCurrentValue("");
    setValuationDate(new Date().toISOString().slice(0, 10));
    setAssetQuery("");
  }, []);

  const fixedIncomeHasOpenPosition = useMemo(() => {
    if (!positionForAsset) {
      return false;
    }
    const invested = Number(positionForAsset.invested_amount);
    return Number.isFinite(invested) && invested > 0;
  }, [positionForAsset]);

  useEffect(() => {
    if (operationMode !== "FIXED_INCOME" || !positionForAsset) {
      return;
    }
    const invested = Number(positionForAsset.invested_amount);
    if (Number.isFinite(invested) && invested > 0) {
      setAppliedValue(String(invested));
    }
  }, [operationMode, positionForAsset]);

  const formatMoneyPayload = (raw: string): string => {
    const parsed = Number(raw.replace(",", ".").trim());
    return parsed.toFixed(4);
  };

  const persistTransaction = async (stayOnPage: boolean) => {
    if (!brokerageAccountId || !assetId || !quantity.trim() || !unitPrice.trim()) {
      setError("Preencha conta, ativo, quantidade e preço.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await portfolioApi.createTransaction({
        brokerage_account_id: brokerageAccountId,
        asset_id: assetId,
        transaction_type: operationMode as "BUY" | "SELL",
        quantity: quantity.trim(),
        unit_price: unitPrice.trim(),
        fees: fees.trim() || "0",
        transaction_date: transactionDate,
      });
      await dispatch(loadPortfolioPage());
      const refreshed = await transactionsApi.fetchTransactions({ page: 1, page_size: 3 });
      setRecentTransactions(refreshed.items);
      if (stayOnPage) {
        resetTradeFields();
      } else {
        navigate("/transactions");
      }
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  const persistIncome = async (stayOnPage: boolean) => {
    if (!brokerageAccountId || !assetId || !grossAmount.trim()) {
      setError("Preencha conta, ativo e valor bruto do provento.");
      return;
    }
    const gross = Number(grossAmount.replace(",", ".").trim());
    const tax = TAX_EXEMPT_INCOME_TYPES.has(incomeType)
      ? 0
      : Number((taxWithheld || "0").replace(",", ".").trim());
    if (!Number.isFinite(gross) || gross < 0 || !Number.isFinite(tax) || tax < 0) {
      setError("Valores financeiros inválidos.");
      return;
    }
    const net = gross - tax;
    if (net < 0) {
      setError("O valor líquido não pode ser negativo.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await incomeEventsApi.createIncomeEvent({
        brokerage_account_id: brokerageAccountId,
        asset_id: assetId,
        income_type: incomeType,
        gross_amount: formatMoneyPayload(String(gross)),
        tax_withheld: formatMoneyPayload(String(tax)),
        net_amount: formatMoneyPayload(String(net)),
        payment_date: paymentDate,
        ex_date: exDate.trim() ? exDate : null,
      });
      if (stayOnPage) {
        resetIncomeFields();
        setError(null);
      } else {
        navigate("/transactions", { state: { incomeSaved: true } });
      }
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  const persistFixedIncome = async (stayOnPage: boolean) => {
    if (!brokerageAccountId || !assetId || !currentValue.trim()) {
      setError("Preencha conta, ativo e saldo bruto.");
      return;
    }
    const value = Number(currentValue.replace(",", ".").trim());
    if (!Number.isFinite(value) || value <= 0) {
      setError("Informe um saldo bruto maior que zero.");
      return;
    }
    let appliedPayload: string | undefined;
    if (!fixedIncomeHasOpenPosition) {
      if (!appliedValue.trim()) {
        setError("Informe o valor aplicado (capital inicial do título).");
        return;
      }
      const applied = Number(appliedValue.replace(",", ".").trim());
      if (!Number.isFinite(applied) || applied <= 0) {
        setError("Informe um valor aplicado maior que zero.");
        return;
      }
      appliedPayload = formatMoneyPayload(String(applied));
    } else if (appliedValue.trim()) {
      const applied = Number(appliedValue.replace(",", ".").trim());
      if (Number.isFinite(applied) && applied > 0) {
        appliedPayload = formatMoneyPayload(String(applied));
      }
    }
    if (
      selectedAsset &&
      !FIXED_INCOME_ASSET_TYPES.has(selectedAsset.asset_type)
    ) {
      setError("Selecione um ativo de Tesouro Direto ou Renda Fixa Manual.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await fixedIncomeValuationsApi.createFixedIncomeValuation({
        brokerage_account_id: brokerageAccountId,
        asset_id: assetId,
        ...(appliedPayload ? { applied_value: appliedPayload } : {}),
        current_value: formatMoneyPayload(String(value)),
        valuation_date: valuationDate,
      });
      await dispatch(loadPortfolioPage());
      if (stayOnPage) {
        resetFixedIncomeFields();
        setError(null);
      } else {
        navigate("/transactions", { state: { fixedIncomeSaved: true } });
      }
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (operationMode === "INCOME") {
      await persistIncome(false);
      return;
    }
    if (operationMode === "FIXED_INCOME") {
      await persistFixedIncome(false);
      return;
    }
    await persistTransaction(false);
  };

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-outline-variant/30 pb-2 sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-headline text-xl font-bold tracking-tight text-on-surface">
              Novo lançamento
            </h1>
            <span className="rounded-full border border-primary-fixed/30 bg-primary-container/15 px-2 py-0.5 text-xs font-medium text-primary-fixed">
              Manual &amp; B3 Sync
            </span>
          </div>
          <p className="mt-0.5 text-xs text-on-surface-variant">
            Registre compras, vendas ou proventos recebidos na sua carteira de investimentos.
          </p>
        </div>
        <Link
          to="/portfolio"
          className="inline-flex items-center gap-2 self-start rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 py-1.5 text-xs font-semibold text-primary-fixed transition-all hover:bg-surface-container-high sm:self-auto"
        >
          <MaterialIcon name="arrow_back" size={14} />
          Voltar à carteira
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-on-surface-variant">Carregando dados…</p>
      ) : accounts.length === 0 ? (
        <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-space-lg text-sm text-on-surface-variant">
          Cadastre uma conta em{" "}
          <Link to="/accounts" className="font-medium text-primary-fixed hover:underline">
            Contas &amp; Instituições
          </Link>{" "}
          antes de lançar operações.
        </section>
      ) : assets.length === 0 ? (
        <section className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-space-lg text-sm text-on-surface-variant">
          <p className="font-medium text-on-surface">Catálogo de ativos vazio.</p>
          <p className="mt-space-xs">
            Cadastre um ativo em{" "}
            <Link to="/assets" className="font-medium text-primary-fixed hover:underline">
              Ativos
            </Link>{" "}
            antes de lançar operações.
          </p>
        </section>
      ) : (
        <form onSubmit={onSubmit} className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            <div className="relative overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-low p-6 shadow-lg">
              {error ? (
                <p role="alert" className="mb-4 text-sm text-error">
                  {error}
                </p>
              ) : null}

              <TransactionOperationSelector
                value={operationMode}
                onChange={setOperationMode}
              />

              <div className="mb-6 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label
                    className="text-xs font-semibold text-on-surface"
                    htmlFor="brokerage-account"
                  >
                    Instituição / Conta de Custódia
                  </label>
                  {currentUser ? (
                    <span className="text-[11px] text-on-surface-variant">
                      Titular:{" "}
                      <strong className="font-medium text-primary-fixed">{currentUser.name}</strong>
                    </span>
                  ) : null}
                </div>
                <div className="relative">
                  <MaterialIcon
                    name="account_balance"
                    size={16}
                    className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-primary-fixed"
                  />
                  <select
                    id="brokerage-account"
                    value={brokerageAccountId}
                    onChange={(e) => setBrokerageAccountId(e.target.value)}
                    className={selectFieldClassName}
                  >
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.institution.name} — C/C {account.account_number}
                      </option>
                    ))}
                  </select>
                  <MaterialIcon
                    name="expand_more"
                    size={16}
                    className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-outline"
                  />
                </div>
              </div>

              <fieldset className="mb-6 space-y-3">
                <legend className="flex w-full items-center justify-between text-xs font-semibold text-on-surface">
                  <span>Selecione o Ativo</span>
                  <span className="font-normal text-[11px] text-on-surface-variant">
                    Filtro rápido
                  </span>
                </legend>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                  {TYPE_FILTERS.map((item) => {
                    const active = assetTypeFilter === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setAssetTypeFilter(item.id)}
                        className={[
                          "shrink-0 rounded-md px-2.5 py-1 font-medium transition-colors",
                          active
                            ? "bg-primary-container font-semibold text-on-primary shadow-sm"
                            : "bg-surface-container-high text-on-surface-variant hover:bg-outline-variant/30 hover:text-on-surface",
                        ].join(" ")}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
                <div className="relative">
                  <MaterialIcon
                    name="search"
                    size={16}
                    className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-primary-fixed"
                  />
                  <input
                    type="search"
                    value={assetQuery}
                    onChange={(e) => setAssetQuery(e.target.value)}
                    placeholder="Digite ticker, nome ou emissor…"
                    className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-low py-2.5 pr-12 pl-10 text-xs font-medium text-on-surface placeholder:text-outline focus:border-primary-fixed focus:ring-2 focus:ring-primary-fixed/40 focus:outline-none"
                  />
                  {assetQuery ? (
                    <button
                      type="button"
                      className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-1 text-outline hover:text-on-surface"
                      aria-label="Limpar busca"
                      onClick={() => setAssetQuery("")}
                    >
                      <MaterialIcon name="close" size={14} />
                    </button>
                  ) : null}
                </div>

                {filteredAssets.length === 0 ? (
                  <p className="rounded-xl border border-outline-variant/25 bg-surface-dim/50 px-3 py-2 text-xs text-on-surface-variant">
                    {operationMode === "FIXED_INCOME"
                      ? "Cadastre um ativo de Tesouro ou Renda Fixa Manual em Ativos antes de marcar o saldo."
                      : "Nenhum ativo encontrado com este filtro ou busca. Ajuste os filtros acima."}
                  </p>
                ) : (
                  <ul
                    className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-outline-variant/25 p-1"
                    role="listbox"
                    aria-label="Ativos filtrados"
                  >
                    {filteredAssets.map((asset) => {
                      const selected = asset.id === assetId;
                      return (
                        <li key={asset.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={selected}
                            onClick={() => setAssetId(asset.id)}
                            className={[
                              "flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-colors",
                              selected
                                ? "border border-primary-fixed/30 bg-primary-container/15 text-on-surface ring-1 ring-primary-fixed/20"
                                : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
                            ].join(" ")}
                          >
                            <span className="truncate font-medium">
                              {formatAssetOptionLabel(asset)}
                            </span>
                            <span className="ml-2 shrink-0 rounded border border-outline-variant/30 bg-surface-dim px-1.5 py-0.5 font-mono-financial text-[10px] text-primary-fixed">
                              {assetTypeLabel(asset.asset_type)}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {selectedAsset ? <SelectedAssetPreview asset={selectedAsset} /> : null}
              </fieldset>

              {operationMode === "INCOME" ? (
                <IncomeEventFormFields
                  assetType={selectedAsset?.asset_type ?? null}
                  incomeType={incomeType}
                  onIncomeTypeChange={setIncomeType}
                  paymentDate={paymentDate}
                  onPaymentDateChange={setPaymentDate}
                  exDate={exDate}
                  onExDateChange={setExDate}
                  grossAmount={grossAmount}
                  onGrossAmountChange={setGrossAmount}
                  taxWithheld={taxWithheld}
                  onTaxWithheldChange={setTaxWithheld}
                  netPreview={totalPreview ?? "—"}
                  submitting={submitting}
                  onSaveAndNew={() => void persistIncome(true)}
                  onCancel={() => navigate("/transactions")}
                />
              ) : operationMode === "FIXED_INCOME" ? (
                <FixedIncomeValuationFormFields
                  valuationDate={valuationDate}
                  onValuationDateChange={setValuationDate}
                  appliedValue={appliedValue}
                  onAppliedValueChange={setAppliedValue}
                  appliedValueLocked={fixedIncomeHasOpenPosition}
                  currentValue={currentValue}
                  onCurrentValueChange={setCurrentValue}
                  submitting={submitting}
                  onSaveAndNew={() => void persistFixedIncome(true)}
                  onCancel={() => navigate("/transactions")}
                />
              ) : (
                <TransactionFormFields
                  transactionDate={transactionDate}
                  setTransactionDate={setTransactionDate}
                  quantity={quantity}
                  setQuantity={setQuantity}
                  unitPrice={unitPrice}
                  setUnitPrice={setUnitPrice}
                  fees={fees}
                  setFees={setFees}
                  submitting={submitting}
                  onSaveAndNew={() => void persistTransaction(true)}
                  onCancel={() => navigate("/transactions")}
                />
              )}
            </div>
          </div>

          <div className="space-y-6 lg:col-span-5">
            <TransactionSummaryPanel
              operationMode={operationMode}
              totalPreview={totalPreview}
              totalBreakdown={totalBreakdown}
              averageProjection={averageProjection}
              institutionLabel={institutionSummaryLabel}
              custodyQuantity={custodyQuantity}
            />
            <RecentTransactionsSidebar items={recentTransactions} loading={recentLoading} />
          </div>
        </form>
      )}
    </main>
  );
}

function TransactionFormFields(props: {
  transactionDate: string;
  setTransactionDate: (value: string) => void;
  quantity: string;
  setQuantity: (value: string) => void;
  unitPrice: string;
  setUnitPrice: (value: string) => void;
  fees: string;
  setFees: (value: string) => void;
  submitting: boolean;
  onSaveAndNew: () => void;
  onCancel: () => void;
}) {
  const {
    transactionDate,
    setTransactionDate,
    quantity,
    setQuantity,
    unitPrice,
    setUnitPrice,
    fees,
    setFees,
    submitting,
    onSaveAndNew,
    onCancel,
  } = props;

  const inputClassName =
    "rounded-xl border-outline-variant/40 bg-surface-container-low text-sm focus:border-primary-fixed focus:ring-primary-fixed/40";

  return (
    <div className="space-y-4 border-t border-outline-variant/30 pt-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          id="transaction-date"
          label="Data do pregão / operação"
          type="date"
          value={transactionDate}
          onChange={(e) => setTransactionDate(e.target.value)}
          className={inputClassName}
          required
        />
        <div className="flex flex-col justify-end space-y-1.5">
          <span className="text-[10px] text-on-surface-variant">Atalhos de data</span>
          <div className="flex gap-2">
            {[
              { label: "Hoje", offset: 0 },
              { label: "Ontem", offset: -1 },
              { label: "D - 2", offset: -2 },
            ].map((shortcut) => (
              <button
                key={shortcut.label}
                type="button"
                onClick={() => setTransactionDate(isoDateOffset(shortcut.offset))}
                className="flex-1 rounded-xl border border-outline-variant/40 bg-surface-container-low py-2 text-center text-xs font-medium text-on-surface transition-colors hover:bg-surface-container-high"
              >
                {shortcut.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <TextField
          id="quantity"
          label="Quantidade"
          inputMode="decimal"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className={`${inputClassName} font-mono-financial font-bold`}
          required
        />
        <TextField
          id="unit-price"
          label="Preço unitário"
          inputMode="decimal"
          value={unitPrice}
          onChange={(e) => setUnitPrice(e.target.value)}
          className={`${inputClassName} font-mono-financial font-bold`}
          required
        />
        <TextField
          id="fees"
          label="Taxas & B3"
          inputMode="decimal"
          value={fees}
          onChange={(e) => setFees(e.target.value)}
          className={`${inputClassName} font-mono-financial`}
        />
      </div>

      <div className="flex flex-col items-center gap-3 border-t border-outline-variant/30 pt-5 sm:flex-row">
        <button
          type="submit"
          disabled={submitting || !quantity.trim() || !unitPrice.trim()}
          className="flex w-full flex-1 items-center justify-center gap-2 rounded-xl border border-primary-fixed/20 bg-primary-container py-3 text-xs font-bold tracking-wide text-white shadow-lg shadow-primary-container/25 transition-transform active:scale-[0.99] disabled:opacity-50 sm:w-auto"
        >
          <MaterialIcon name="check_circle" size={16} />
          {submitting ? "Salvando…" : "Confirmar e salvar lançamento"}
        </button>
        <button
          type="button"
          disabled={submitting || !quantity.trim() || !unitPrice.trim()}
          onClick={onSaveAndNew}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-outline-variant/40 bg-surface-container-low px-4 py-3 text-xs font-semibold text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-50 sm:w-auto"
        >
          <MaterialIcon name="library_add" size={16} className="text-outline" />
          Salvar &amp; novo
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="w-full text-xs font-semibold text-on-surface-variant transition-colors hover:text-on-surface sm:w-auto"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}