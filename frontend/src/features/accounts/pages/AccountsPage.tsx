import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";

import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { MaterialIcon } from "../../../components/MaterialIcon";
import { shortDisplayName, userInitials } from "../../../utils/userDisplay";
import type { BrokerageAccount, InstitutionType } from "../../../types/accounts";
import {
  isBankInstitution,
  isBrokerageInstitution,
  institutionMonogram,
} from "../utils/institutionDisplay";
import {
  clearAccountsError,
  createAccount,
  deleteAccount,
  loadAccountsPage,
  updateAccount,
} from "../accountsSlice";

type TableFilter = "all" | "brokerage" | "bank";

const FILTER_TABS: { id: TableFilter; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "brokerage", label: "Corretoras" },
  { id: "bank", label: "Bancos" },
];

export function AccountsPage() {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.auth.currentUser);
  const { institutions, accounts, listStatus, mutationStatus, error } = useAppSelector(
    (state) => state.accounts,
  );

  const [tableFilter, setTableFilter] = useState<TableFilter>("all");
  const [scopePill, setScopePill] = useState<"consolidated" | "self">("consolidated");
  const [showConnectForm, setShowConnectForm] = useState(false);
  const [institutionId, setInstitutionId] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const holderName = currentUser?.name ?? "—";
  const holderShort = currentUser ? shortDisplayName(currentUser.name) : "—";
  const holderInitials = currentUser ? userInitials(currentUser.name) : "?";

  useEffect(() => {
    void dispatch(loadAccountsPage());
  }, [dispatch]);

  useEffect(() => {
    if (!institutionId && institutions.length > 0) {
      setInstitutionId(institutions[0].id);
    }
  }, [institutionId, institutions]);

  const mutating = mutationStatus === "loading";
  const loadingList = listStatus === "loading" && accounts.length === 0;

  const filterCounts = useMemo(() => {
    const brokerage = accounts.filter((a) =>
      isBrokerageInstitution(a.institution.institution_type),
    ).length;
    const bank = accounts.filter((a) => isBankInstitution(a.institution.institution_type)).length;
    return { all: accounts.length, brokerage, bank };
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    return accounts.filter((account) => {
      const type = account.institution.institution_type;
      if (tableFilter === "brokerage") {
        return isBrokerageInstitution(type);
      }
      if (tableFilter === "bank") {
        return isBankInstitution(type);
      }
      return true;
    });
  }, [accounts, tableFilter]);

  const openConnectForm = () => {
    setEditingId(null);
    setAccountNumber("");
    setPendingDeleteId(null);
    dispatch(clearAccountsError());
    setShowConnectForm(true);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!institutionId || !accountNumber.trim()) {
      return;
    }
    if (editingId) {
      void dispatch(
        updateAccount({
          accountId: editingId,
          body: { institution_id: institutionId, account_number: accountNumber.trim() },
        }),
      ).then((result) => {
        if (updateAccount.fulfilled.match(result)) {
          setEditingId(null);
          setAccountNumber("");
          setShowConnectForm(false);
        }
      });
      return;
    }
    void dispatch(
      createAccount({
        institution_id: institutionId,
        account_number: accountNumber.trim(),
      }),
    ).then((result) => {
      if (createAccount.fulfilled.match(result)) {
        setAccountNumber("");
        setShowConnectForm(false);
      }
    });
  };

  const onEdit = (account: BrokerageAccount) => {
    setEditingId(account.id);
    setInstitutionId(account.institution_id);
    setAccountNumber(account.account_number);
    setPendingDeleteId(null);
    setShowConnectForm(true);
    dispatch(clearAccountsError());
  };

  const onCancelForm = () => {
    setEditingId(null);
    setAccountNumber("");
    setShowConnectForm(false);
    dispatch(clearAccountsError());
  };

  const onConfirmDelete = (accountId: string) => {
    void dispatch(deleteAccount(accountId)).then((result) => {
      if (deleteAccount.fulfilled.match(result)) {
        setPendingDeleteId(null);
        if (editingId === accountId) {
          onCancelForm();
        }
      }
    });
  };

  return (
    <div className="flex w-full flex-col pb-space-xl">
      <section className="flex flex-col gap-space-md py-space-lg lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-space-xs">
          <h1 className="font-headline text-2xl font-semibold tracking-tight text-on-surface">
            Contas &amp; Instituições
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-space-sm">
          <div className="flex items-center rounded-lg bg-surface-container-low p-0.5 shadow-sm">
            <ScopePill
              active={scopePill === "consolidated"}
              onClick={() => setScopePill("consolidated")}
            >
              Consolidado
            </ScopePill>
            <ScopePill active={scopePill === "self"} onClick={() => setScopePill("self")}>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-secondary-container" />
                {holderShort}
              </span>
            </ScopePill>
          </div>

          <button
            type="button"
            disabled
            title="Open Finance fora do escopo do MVP"
            className="flex cursor-not-allowed items-center gap-space-xs rounded-lg bg-surface-container px-space-md py-2 text-xs font-semibold text-on-surface-variant opacity-60"
          >
            <MaterialIcon name="sync" size={18} />
            <span>Sincronizar Todas</span>
          </button>

          <button
            type="button"
            onClick={openConnectForm}
            className="flex items-center gap-space-xs rounded-lg bg-primary-container px-space-md py-2 text-xs font-semibold text-on-primary-fixed shadow-sm transition-all hover:opacity-90"
          >
            <MaterialIcon name="add" size={18} />
            <span>Conectar Nova Instituição</span>
          </button>
        </div>
      </section>

      {showConnectForm ? (
        <section className="mb-space-md rounded-lg bg-surface-container-low p-space-md shadow-sm">
          <h2 className="font-headline text-base font-semibold text-on-surface">
            {editingId ? "Editar conta" : "Nova conta"}
          </h2>
          <form
            className="mt-space-md grid gap-space-md lg:grid-cols-[2fr_1.5fr_auto]"
            onSubmit={onSubmit}
          >
            <label htmlFor="institution" className="flex flex-col gap-space-xs text-xs">
              <span className="font-semibold text-on-surface-variant">Instituição</span>
              <select
                id="institution"
                required
                value={institutionId}
                onChange={(event) => setInstitutionId(event.target.value)}
                className="rounded border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 text-sm text-on-surface outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
              >
                {institutions.length === 0 ? (
                  <option value="">Nenhuma instituição</option>
                ) : null}
                {institutions.map((institution) => (
                  <option key={institution.id} value={institution.id}>
                    {institution.name}
                  </option>
                ))}
              </select>
            </label>
            <label htmlFor="account-number" className="flex flex-col gap-space-xs text-xs">
              <span className="font-semibold text-on-surface-variant">Número da conta</span>
              <input
                id="account-number"
                required
                value={accountNumber}
                onChange={(event) => setAccountNumber(event.target.value)}
                className="rounded border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 text-sm tabular-nums text-on-surface outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
              />
            </label>
            <div className="flex items-end gap-space-sm">
              <button
                type="submit"
                disabled={mutating || !institutionId}
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

      <div className="mb-space-md flex flex-col justify-between gap-space-sm rounded-lg bg-surface-container-low p-space-sm shadow-sm sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-space-xs">
          {FILTER_TABS.map((tab) => {
            const count = filterCounts[tab.id];
            const isActive = tableFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTableFilter(tab.id)}
                className={[
                  "rounded px-space-sm py-1 text-[11px] font-semibold tracking-wide transition-all",
                  isActive
                    ? "bg-primary-container text-on-primary-fixed"
                    : "text-on-surface-variant hover:text-on-surface",
                ].join(" ")}
              >
                {tab.label} ({count})
              </button>
            );
          })}
        </div>
        <p className="px-space-sm text-[11px] text-on-surface-variant tabular-nums">
          Custódia manual · cadastro por conta
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg bg-surface-container-low shadow-sm">
        {loadingList ? (
          <p className="p-space-lg text-sm text-on-surface-variant">Carregando...</p>
        ) : filteredAccounts.length === 0 ? (
          <p className="p-space-lg text-sm text-on-surface-variant">
            {accounts.length === 0
              ? "Nenhuma conta cadastrada."
              : "Nenhuma conta neste filtro."}
          </p>
        ) : (
          <table className="w-full min-w-[840px] border-collapse text-left">
            <thead>
              <tr className="bg-surface-container text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                <th className="px-space-md py-space-sm">Instituição &amp; Conexão</th>
                <th className="px-space-md py-space-sm">Titular / Conta</th>
                <th className="px-space-md py-space-sm">Ativos Alocados</th>
                <th className="px-space-md py-space-sm text-right">Saldo em Custódia</th>
                <th className="px-space-md py-space-sm">Status</th>
                <th className="px-space-md py-space-sm text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high/40">
              {filteredAccounts.map((account) => (
                <AccountRow
                  key={account.id}
                  account={account}
                  holderName={holderName}
                  holderInitials={holderInitials}
                  mutating={mutating}
                  pendingDelete={pendingDeleteId === account.id}
                  onEdit={() => onEdit(account)}
                  onDeleteRequest={() => setPendingDeleteId(account.id)}
                  onDeleteCancel={() => setPendingDeleteId(null)}
                  onDeleteConfirm={() => onConfirmDelete(account.id)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function ScopePill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded px-space-sm py-1 text-[11px] font-semibold transition-all",
        active
          ? "bg-surface-container-high text-on-surface"
          : "text-on-surface-variant hover:text-on-surface",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function AccountRow({
  account,
  holderName,
  holderInitials,
  mutating,
  pendingDelete,
  onEdit,
  onDeleteRequest,
  onDeleteCancel,
  onDeleteConfirm,
}: {
  account: BrokerageAccount;
  holderName: string;
  holderInitials: string;
  mutating: boolean;
  pendingDelete: boolean;
  onEdit: () => void;
  onDeleteRequest: () => void;
  onDeleteCancel: () => void;
  onDeleteConfirm: () => void;
}) {
  const monogram = institutionMonogram(account.institution.name);
  const accentClass = monogramAccent(account.institution.institution_type);

  return (
    <tr className="transition-colors hover:bg-surface-container/50">
      <td className="px-space-md py-space-md">
        <div className="flex items-center gap-space-sm">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded bg-surface-container-highest text-sm font-bold ${accentClass}`}
          >
            {monogram}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-on-surface">{account.institution.name}</span>
            <div className="mt-0.5 flex flex-wrap items-center gap-1">
              <span className="rounded bg-tertiary-container px-1 text-[10px] font-semibold text-on-tertiary-container">
                CUSTÓDIA MANUAL
              </span>
              <span className="text-[11px] text-on-surface-variant">Lançamentos e PDF</span>
            </div>
          </div>
        </div>
      </td>
      <td className="px-space-md py-space-md">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-secondary-container text-[10px] font-semibold text-on-secondary">
              {holderInitials}
            </span>
            <span className="text-xs text-on-surface">{holderName}</span>
          </div>
          <span className="text-[11px] tabular-nums text-on-surface-variant">{`Conta: ${account.account_number}`}</span>
        </div>
      </td>
      <td className="px-space-md py-space-md">
        <span className="text-xs italic text-on-surface-variant">Sem posições ativas</span>
      </td>
      <td className="px-space-md py-space-md text-right">
        <div className="flex flex-col items-end">
          <span className="text-sm font-semibold tabular-nums text-on-surface-variant">—</span>
          <span className="text-[11px] tabular-nums text-on-surface-variant">—</span>
        </div>
      </td>
      <td className="px-space-md py-space-md">
        <div className="inline-flex items-center gap-1 rounded bg-surface-container px-2 py-0.5 text-[11px] font-semibold text-tertiary">
          <span className="h-1.5 w-1.5 rounded-full bg-tertiary" />
          <span>Manual</span>
        </div>
      </td>
      <td className="px-space-md py-space-md text-right">
        {pendingDelete ? (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              disabled={mutating}
              onClick={onDeleteConfirm}
              className="rounded px-2 py-0.5 text-[11px] font-semibold text-error hover:bg-surface-container"
            >
              Confirmar
            </button>
            <button
              type="button"
              onClick={onDeleteCancel}
              className="rounded px-2 py-0.5 text-[11px] text-on-surface-variant hover:bg-surface-container"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              title="Editar parâmetros"
              aria-label={`Editar parâmetros da conta ${account.account_number}`}
              onClick={onEdit}
              className="rounded p-1 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
            >
              <MaterialIcon name="tune" size={18} />
            </button>
            <button
              type="button"
              title="Excluir conta"
              aria-label={`Excluir conta ${account.account_number}`}
              onClick={onDeleteRequest}
              className="rounded p-1 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-error"
            >
              <MaterialIcon name="delete" size={18} />
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

function monogramAccent(type: InstitutionType): string {
  if (type === "BANK") {
    return "text-tertiary";
  }
  return "text-secondary";
}