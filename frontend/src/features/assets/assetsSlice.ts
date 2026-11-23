import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { getErrorMessage } from "../../services/api";
import * as assetsApi from "../../services/assetsApi";
import type { Asset, AssetType, AssetWrite } from "../../types/assets";

type RequestStatus = "idle" | "loading" | "failed";

type AssetsState = {
  items: Asset[];
  selectedId: string | null;
  listStatus: RequestStatus;
  mutationStatus: RequestStatus;
  error: string | null;
};

const initialState: AssetsState = {
  items: [],
  selectedId: null,
  listStatus: "idle",
  mutationStatus: "idle",
  error: null,
};

export const loadAssetsPage = createAsyncThunk(
  "assets/loadPage",
  async (_, { rejectWithValue }) => {
    try {
      return await assetsApi.fetchAssets();
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const createAsset = createAsyncThunk(
  "assets/create",
  async (body: AssetWrite, { rejectWithValue }) => {
    try {
      return await assetsApi.createAsset(body);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const updateAsset = createAsyncThunk(
  "assets/update",
  async (
    payload: { assetId: string; body: Partial<AssetWrite> },
    { rejectWithValue },
  ) => {
    try {
      return await assetsApi.updateAsset(payload.assetId, payload.body);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export type AssetTableFilter = "all" | AssetType;

const assetsSlice = createSlice({
  name: "assets",
  initialState,
  reducers: {
    resetAssets() {
      return initialState;
    },
    clearAssetsError(state) {
      state.error = null;
    },
    selectAsset(state, action: { payload: string | null }) {
      state.selectedId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadAssetsPage.pending, (state) => {
        state.listStatus = "loading";
        state.error = null;
      })
      .addCase(loadAssetsPage.fulfilled, (state, action) => {
        state.listStatus = "idle";
        state.items = action.payload;
      })
      .addCase(loadAssetsPage.rejected, (state, action) => {
        state.listStatus = "failed";
        state.error = (action.payload as string) ?? "Não foi possível carregar os ativos.";
      })
      .addCase(createAsset.pending, (state) => {
        state.mutationStatus = "loading";
        state.error = null;
      })
      .addCase(createAsset.fulfilled, (state, action) => {
        state.mutationStatus = "idle";
        state.items = [...state.items, action.payload].sort(compareAssets);
        state.selectedId = action.payload.id;
      })
      .addCase(createAsset.rejected, (state, action) => {
        state.mutationStatus = "failed";
        state.error = (action.payload as string) ?? "Não foi possível cadastrar o ativo.";
      })
      .addCase(updateAsset.pending, (state) => {
        state.mutationStatus = "loading";
        state.error = null;
      })
      .addCase(updateAsset.fulfilled, (state, action) => {
        state.mutationStatus = "idle";
        state.items = state.items
          .map((item) => (item.id === action.payload.id ? action.payload : item))
          .sort(compareAssets);
        state.selectedId = action.payload.id;
      })
      .addCase(updateAsset.rejected, (state, action) => {
        state.mutationStatus = "failed";
        state.error = (action.payload as string) ?? "Não foi possível atualizar o ativo.";
      });
  },
});

function compareAssets(a: Asset, b: Asset): number {
  const ta = a.ticker ?? "";
  const tb = b.ticker ?? "";
  if (ta !== tb) {
    return ta.localeCompare(tb);
  }
  return a.name.localeCompare(b.name);
}

export const { resetAssets, clearAssetsError, selectAsset } = assetsSlice.actions;
export default assetsSlice.reducer;