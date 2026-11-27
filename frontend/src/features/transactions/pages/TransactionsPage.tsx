import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { MaterialIcon } from "../../../components/MaterialIcon";
import { PaginationBar } from "../../../components/PaginationBar";
import { DEFAULT_TRANSACTION_PAGE_SIZE } from "../../../services/transactionsApi";
import { getErrorMessage } from "../../../services/api";
import * as accountsApi from "../../../services/accountsApi";
import * as incomeEventsApi from "../../../services/incomeEventsApi";
import * as portfolioApi from "../../../services/portfolioApi";
import * as transactionsApi from "../../../services/transactionsApi";
import type { BrokerageAccount } from "../../../types/accounts";
import type { Asset } from "../../../types/assets";
import type { IncomeEvent, IncomeType } from "../../../types/incomeEvents";
import { INCOME_TYPE_LABEL } from "../../../types/incomeEvents";
import type { TransactionListItem } from "../../../types/transactions";
import { formatBrl, formatQuantity, formatUnitPrice } from "../../../utils/money";
import { formatIsoDate } from "../utils/assetDisplay";
import {
  TRANSACTION_DATE_RANGE_PRESETS,
  dateRangeForPreset,
  matchesDateRangePreset,
} from "../utils/dateRange";

function formatDisplayDate(iso: string): string {
  return formatIsoDate(iso);
}

function operationLabel(transactionType: string): string {
  return transactionType === "BUY" ? "Compra" : "Venda";
}

export function TransactionsPage() {
  const location = useLocation();
  const incomeSaved =
    (location.state as { incomeSaved?: boolean } | null)?.incomeSaved === true;
  const [accounts, setAccounts] = useState<BrokerageAccount[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [items, setItems] = useState<TransactionListItem[]>([]);
  const [incomeItems, setIncomeItems] = useState<IncomeEvent[]>([]);
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successHint, setSuccessHint] = useState<string | null>(
    incomeSaved ? "Provento registrado com sucesso." : null,
  );

  useEffect(() => {
    let active = true;
    async function loadAccounts() {
      try {
        const list = await accountsApi.fetchBrokerageAccounts();
        if (active) {
          setAccounts(list);
        }
      } catch {
        /* account list optional for empty filter label */
      }
    }
    void loadAccounts();
    return () => {
      active = false;
    };
  }, []);

  const dateRangeInvalid = Boolean(
    startDate && endDate && startDate > endDate,
  );

  useEffect(() => {
    let active = true;
    async function loadLedger() {
      if (dateRangeInvalid) {
        setError("A data inicial não pode ser posterior à data final.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const accountParam = accountFilter === "all" ? undefined : accountFilter;
        const dateParams = {
          ...(startDate.trim() ? { start_date: startDate.trim() } : {}),
          ...(endDate.trim() ? { end_date: endDate.trim() } : {}),
        };
        const [transactions, income, assetCatalog] = await Promise.all([
          transactionsApi.fetchTransactions({
            brokerage_account_id: accountParam,
            page,
            page_size: DEFAULT_TRANSACTION_PAGE_SIZE,
            ...dateParams,
          }),
          incomeEventsApi.fetchIncomeEvents({
            brokerage_account_id: accountParam,
            ...dateParams,
          }),
          portfolioApi.fetchAssets(),
        ]);
        if (active) {
          setItems(transactions.items);
          setTotalTransactions(transactions.total);
          setIncomeItems(income.items);
          setAssets(assetCatalog);
        }
      } catch (loadError) {
        if (active) {
          setError(getErrorMessage(loadError));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    void loadLedger();
    return () => {
      active = false;
    };
  }, [accountFilter, dateRangeInvalid, endDate, page, startDate]);

  useEffect(() => {
    if (!incomeSaved) {
      return;
    }
    const timer = window.setTimeout(() => setSuccessHint(null), 6000);
    return () => window.clearTimeout(timer);
  }, [incomeSaved]);

  const accountLabelById = useMemo(() => {
    return new Map(
      accounts.map((account) => [
        account.id,
        `${account.institution.name} — ${account.account_number}`,
      ]),
    );
  }, [accounts]);

  const assetById = useMemo(() => new Map(assets.map((asset) => [asset.id, asset])), [assets]);

  return (
    <div className="flex w-full flex-col gap-space-md pb-space-xl">
      <header className="flex flex-col gap-space-md sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-headline text-2xl font-semibold text-on-surface">Lançamentos</h1>
        <Link
          to="/transactions/new"
          className="inline-flex items-center gap-space-xs rounded-lg bg-primary-container px-space-md py-2 text-xs font-semibold text-on-primary-fixed shadow-sm hover:opacity-90"
        >
          <MaterialIcon name="add" size={18} />
          Novo lançamento
        </Link>
      </header>

      <section className="rounded-lg bg-surface-container-low p-space-md shadow-sm">
        <div className="mb-space-md grid grid-cols-1 gap-space-md sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
          <label className="flex flex-col gap-1 text-xs">
            <span className="font-semibold text-on-surface-variant">Conta</span>
            <select
              value={accountFilter}
              onChange={(e) => {
                setAccountFilter(e.target.value);
                setPage(1);
              }}
              className="rounded border border-outline-variant/40 bg-surface px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-secondary"
            >
              <option value="all">Todas as minhas contas</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {accountLabelById.get(account.id)}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="tx-filter-start" className="flex flex-col gap-1 text-xs">
            <span className="font-semibold text-on-surface-variant">Data inicial</span>
            <input
              id="tx-filter-start"
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="rounded border border-outline-variant/40 bg-surface px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-secondary"
            />
          </label>
          <label htmlFor="tx-filter-end" className="flex flex-col gap-1 text-xs">
            <span className="font-semibold text-on-surface-variant">Data final</span>
            <input
              id="tx-filter-end"
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="rounded border border-outline-variant/40 bg-surface px-3 py-2 text-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-secondary"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {(startDate || endDate) ? (
              <button
                type="button"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setPage(1);
                }}
                className="rounded-lg border border-outline-variant/40 px-3 py-2 text-xs font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
              >
                Limpar período
              </button>
            ) : null}
          </div>
        </div>
        <div className="mb-space-md flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <span className="text-xs font-semibold text-on-surface-variant">Período rápido</span>
          <div className="flex flex-wrap gap-2">
            {TRANSACTION_DATE_RANGE_PRESETS.map((preset) => {
              const active = matchesDateRangePreset(startDate, endDate, preset.id);
              return (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    const range = dateRangeForPreset(preset.id);
                    setStartDate(range.startDate);
                    setEndDate(range.endDate);
                    setPage(1);
                  }}
                  className={
                    active
                      ? "rounded-lg border border-secondary/50 bg-secondary-container/25 px-3 py-2 text-xs font-semibold text-on-surface"
                      : "rounded-lg border border-outline-variant/40 px-3 py-2 text-xs font-semibold text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
                  }
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {successHint ? (
          <p
            role="status"
            className="mb-space-md rounded-lg border border-secondary/30 bg-secondary-container/15 px-space-md py-space-sm text-sm text-on-surface"
          >
            {successHint}
          </p>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        ) : loading ? (
          <p className="text-sm text-on-surface-variant">Carregando…</p>
        ) : dateRangeInvalid ? (
          <p className="text-sm text-on-surface-variant">
            Ajuste o intervalo de datas para ver os lançamentos.
          </p>
        ) : totalTransactions === 0 && incomeItems.length === 0 ? (
          <p className="text-sm text-on-surface-variant">
            {startDate || endDate
              ? "Nenhum lançamento no período selecionado."
              : "Nenhum lançamento nesta conta."}{" "}
            <Link to="/transactions/new" className="font-medium text-secondary hover:underline">
              Criar o primeiro
            </Link>
            .
          </p>
        ) : totalTransactions > 0 ? (
          <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-xs">
              <thead>
                <tr className="border-b border-outline-variant/30 text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
                  <th className="px-2 py-2">Data</th>
                  <th className="px-2 py-2">Operação</th>
                  <th className="px-2 py-2">Conta</th>
                  <th className="px-2 py-2">Ativo</th>
                  <th className="px-2 py-2 text-right">Qtd.</th>
                  <th className="px-2 py-2 text-right">Preço</th>
                  <th className="px-2 py-2 text-right">Taxas</th>
                  <th className="px-2 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10 text-on-surface">
                {items.map((row) => (
                  <tr key={row.id} className="hover:bg-surface-container/50">
                    <td className="px-2 py-2.5 tabular-nums">
                      {formatDisplayDate(row.transaction_date)}
                    </td>
                    <td className="px-2 py-2.5">
                      <span
                        className={
                          row.transaction_type === "BUY"
                            ? "font-semibold text-secondary"
                            : "font-semibold text-error"
                        }
                      >
                        {operationLabel(row.transaction_type)}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-on-surface-variant">
                      {row.brokerage_account.institution_name} —{" "}
                      <span className="tabular-nums">{row.brokerage_account.account_number}</span>
                    </td>
                    <td className="px-2 py-2.5">
                      <span className="font-semibold">{row.asset.ticker ?? "—"}</span>
                      <span className="ml-1 text-on-surface-variant">{row.asset.name}</span>
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums">
                      {formatQuantity(row.quantity)}
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums">
                      {formatUnitPrice(row.unit_price)}
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums">
                      {formatBrl(row.fees)}
                    </td>
                    <td className="px-2 py-2.5 text-right font-semibold tabular-nums">
                      {formatBrl(row.total_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationBar
            page={page}
            pageSize={DEFAULT_TRANSACTION_PAGE_SIZE}
            total={totalTransactions}
            onPageChange={setPage}
            itemLabel="lançamentos"
          />
          </>
        ) : null}

        {incomeItems.length > 0 ? (
          <div className="mt-space-lg overflow-x-auto border-t border-outline-variant/20 pt-space-md">
            <h2 className="mb-space-sm text-xs font-bold uppercase tracking-wide text-on-surface-variant">
              Proventos
            </h2>
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead>
                <tr className="border-b border-outline-variant/30 text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
                  <th className="px-2 py-2">Pagamento</th>
                  <th className="px-2 py-2">Tipo</th>
                  <th className="px-2 py-2">Conta</th>
                  <th className="px-2 py-2">Ativo</th>
                  <th className="px-2 py-2 text-right">Bruto</th>
                  <th className="px-2 py-2 text-right">IR</th>
                  <th className="px-2 py-2 text-right">Líquido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10 text-on-surface">
                {incomeItems.map((row) => {
                  const asset = assetById.get(row.asset_id);
                  const incomeType = row.income_type as IncomeType;
                  return (
                    <tr key={row.id} className="hover:bg-surface-container/50">
                      <td className="px-2 py-2.5 tabular-nums">
                        {formatDisplayDate(row.payment_date)}
                      </td>
                      <td className="px-2 py-2.5 font-semibold text-secondary">
                        {INCOME_TYPE_LABEL[incomeType] ?? row.income_type}
                      </td>
                      <td className="px-2 py-2.5 text-on-surface-variant">
                        {accountLabelById.get(row.brokerage_account_id) ?? "—"}
                      </td>
                      <td className="px-2 py-2.5">
                        <span className="font-semibold">{asset?.ticker ?? "—"}</span>
                        {asset ? (
                          <span className="ml-1 text-on-surface-variant">{asset.name}</span>
                        ) : null}
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums">
                        {formatBrl(row.gross_amount)}
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums">
                        {formatBrl(row.tax_withheld)}
                      </td>
                      <td className="px-2 py-2.5 text-right font-semibold tabular-nums">
                        {formatBrl(row.net_amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}