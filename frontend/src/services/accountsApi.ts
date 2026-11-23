import type {
  BrokerageAccount,
  BrokerageAccountWrite,
  Institution,
} from "../types/accounts";
import api from "./api";

export async function fetchInstitutions(): Promise<Institution[]> {
  const { data } = await api.get<Institution[]>("/institutions");
  return data;
}

export async function fetchBrokerageAccounts(
  userId?: string,
): Promise<BrokerageAccount[]> {
  const { data } = await api.get<BrokerageAccount[]>("/brokerage-accounts", {
    params: userId ? { user_id: userId } : undefined,
  });
  return data;
}

export async function createBrokerageAccount(
  body: BrokerageAccountWrite,
): Promise<BrokerageAccount> {
  const { data } = await api.post<BrokerageAccount>("/brokerage-accounts", body);
  return data;
}

export async function updateBrokerageAccount(
  accountId: string,
  body: Partial<BrokerageAccountWrite>,
): Promise<BrokerageAccount> {
  const { data } = await api.patch<BrokerageAccount>(
    `/brokerage-accounts/${accountId}`,
    body,
  );
  return data;
}

export async function deleteBrokerageAccount(accountId: string): Promise<void> {
  await api.delete(`/brokerage-accounts/${accountId}`);
}
