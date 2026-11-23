import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { getErrorMessage } from "../../services/api";
import * as accountsApi from "../../services/accountsApi";
import type {
  BrokerageAccount,
  BrokerageAccountWrite,
  Institution,
} from "../../types/accounts";

type RequestStatus = "idle" | "loading" | "failed";

type AccountsState = {
  institutions: Institution[];
  accounts: BrokerageAccount[];
  listStatus: RequestStatus;
  mutationStatus: RequestStatus;
  error: string | null;
};

const initialState: AccountsState = {
  institutions: [],
  accounts: [],
  listStatus: "idle",
  mutationStatus: "idle",
  error: null,
};

export const loadAccountsPage = createAsyncThunk(
  "accounts/loadPage",
  async (_, { rejectWithValue }) => {
    try {
      const [institutions, accounts] = await Promise.all([
        accountsApi.fetchInstitutions(),
        accountsApi.fetchBrokerageAccounts(),
      ]);
      return { institutions, accounts };
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const createAccount = createAsyncThunk(
  "accounts/create",
  async (body: BrokerageAccountWrite, { rejectWithValue }) => {
    try {
      return await accountsApi.createBrokerageAccount(body);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const updateAccount = createAsyncThunk(
  "accounts/update",
  async (
    payload: { accountId: string; body: Partial<BrokerageAccountWrite> },
    { rejectWithValue },
  ) => {
    try {
      return await accountsApi.updateBrokerageAccount(payload.accountId, payload.body);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const deleteAccount = createAsyncThunk(
  "accounts/delete",
  async (accountId: string, { rejectWithValue }) => {
    try {
      await accountsApi.deleteBrokerageAccount(accountId);
      return accountId;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

const accountsSlice = createSlice({
  name: "accounts",
  initialState,
  reducers: {
    resetAccounts() {
      return initialState;
    },
    clearAccountsError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadAccountsPage.pending, (state) => {
        state.listStatus = "loading";
        state.error = null;
      })
      .addCase(loadAccountsPage.fulfilled, (state, action) => {
        state.listStatus = "idle";
        state.institutions = action.payload.institutions;
        state.accounts = action.payload.accounts;
      })
      .addCase(loadAccountsPage.rejected, (state, action) => {
        state.listStatus = "failed";
        state.error = (action.payload as string) ?? "Não foi possível carregar as contas.";
      })
      .addCase(createAccount.pending, (state) => {
        state.mutationStatus = "loading";
        state.error = null;
      })
      .addCase(createAccount.fulfilled, (state, action) => {
        state.mutationStatus = "idle";
        state.accounts.unshift(action.payload);
      })
      .addCase(createAccount.rejected, (state, action) => {
        state.mutationStatus = "failed";
        state.error = (action.payload as string) ?? "Não foi possível cadastrar a conta.";
      })
      .addCase(updateAccount.pending, (state) => {
        state.mutationStatus = "loading";
        state.error = null;
      })
      .addCase(updateAccount.fulfilled, (state, action) => {
        state.mutationStatus = "idle";
        state.accounts = state.accounts.map((account) =>
          account.id === action.payload.id ? action.payload : account,
        );
      })
      .addCase(updateAccount.rejected, (state, action) => {
        state.mutationStatus = "failed";
        state.error = (action.payload as string) ?? "Não foi possível atualizar a conta.";
      })
      .addCase(deleteAccount.pending, (state) => {
        state.mutationStatus = "loading";
        state.error = null;
      })
      .addCase(deleteAccount.fulfilled, (state, action) => {
        state.mutationStatus = "idle";
        state.accounts = state.accounts.filter((account) => account.id !== action.payload);
      })
      .addCase(deleteAccount.rejected, (state, action) => {
        state.mutationStatus = "failed";
        state.error = (action.payload as string) ?? "Não foi possível excluir a conta.";
      });
  },
});

export const { resetAccounts, clearAccountsError } = accountsSlice.actions;
export default accountsSlice.reducer;
