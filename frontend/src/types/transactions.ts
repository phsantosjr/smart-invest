export type TransactionType = "BUY" | "SELL";

export type OperationMode = TransactionType | "INCOME" | "FIXED_INCOME";

export type TransactionWrite = {
  brokerage_account_id: string;
  asset_id: string;
  transaction_type: TransactionType;
  quantity: string;
  unit_price: string;
  fees: string;
  transaction_date: string;
};

export type Transaction = TransactionWrite & {
  id: string;
  total_amount: string;
  created_at: string;
};

export type TransactionListItem = Transaction & {
  asset: {
    id: string;
    ticker: string | null;
    name: string;
    asset_type: string;
  };
  brokerage_account: {
    id: string;
    account_number: string;
    institution_name: string;
  };
};

export type TransactionListResponse = {
  items: TransactionListItem[];
  total: number;
  page: number;
  page_size: number;
};

export type FetchTransactionsParams = {
  brokerage_account_id?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
};