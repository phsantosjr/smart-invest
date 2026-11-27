import type {
  Transaction,
  TransactionListResponse,
  FetchTransactionsParams,
  TransactionWrite,
} from "../types/transactions";
import api from "./api";

export const DEFAULT_TRANSACTION_PAGE_SIZE = 20;

export async function fetchTransactions(
  params?: FetchTransactionsParams,
): Promise<TransactionListResponse> {
  const { data } = await api.get<TransactionListResponse>("/transactions", {
    params: {
      page: params?.page ?? 1,
      page_size: params?.page_size ?? DEFAULT_TRANSACTION_PAGE_SIZE,
      ...(params?.brokerage_account_id
        ? { brokerage_account_id: params.brokerage_account_id }
        : {}),
      ...(params?.start_date ? { start_date: params.start_date } : {}),
      ...(params?.end_date ? { end_date: params.end_date } : {}),
    },
  });
  return data;
}

export async function createTransaction(body: TransactionWrite): Promise<Transaction> {
  const { data } = await api.post<Transaction>("/transactions", body);
  return data;
}