import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";

import { getErrorMessage } from "../../services/api";
import * as authApi from "../../services/authApi";
import type { LoginRequest } from "../../types/auth";
import type { UserProfile } from "../../types/user";

const TOKEN_KEY = "smart-invest-access-token";

export type AuthPhase = "credentials" | "totp";

type AuthState = {
  accessToken: string | null;
  tempToken: string | null;
  requires2fa: boolean;
  phase: AuthPhase;
  status: "idle" | "loading" | "failed";
  profileStatus: "idle" | "loading" | "failed";
  currentUser: UserProfile | null;
  error: string | null;
};

const storedToken =
  typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;

const initialState: AuthState = {
  accessToken: storedToken,
  tempToken: null,
  requires2fa: false,
  phase: "credentials",
  status: "idle",
  profileStatus: "idle",
  currentUser: null,
  error: null,
};

export const login = createAsyncThunk(
  "auth/login",
  async (credentials: LoginRequest, { rejectWithValue }) => {
    try {
      return await authApi.login(credentials);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const loadCurrentUser = createAsyncThunk(
  "auth/loadCurrentUser",
  async (_, { rejectWithValue }) => {
    try {
      return await authApi.fetchMe();
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

export const verify2fa = createAsyncThunk(
  "auth/verify2fa",
  async (code: string, { getState, rejectWithValue }) => {
    const { tempToken } = (getState() as { auth: AuthState }).auth;
    if (!tempToken) {
      return rejectWithValue("Sessão 2FA expirada.");
    }
    try {
      return await authApi.verify2fa({ temp_token: tempToken, code });
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      state.accessToken = null;
      state.tempToken = null;
      state.requires2fa = false;
      state.phase = "credentials";
      state.status = "idle";
      state.profileStatus = "idle";
      state.currentUser = null;
      state.error = null;
      localStorage.removeItem(TOKEN_KEY);
    },
    resetLoginFlow(state) {
      state.tempToken = null;
      state.requires2fa = false;
      state.phase = "credentials";
      state.error = null;
      state.status = "idle";
    },
    setAccessToken(state, action: PayloadAction<string>) {
      state.accessToken = action.payload;
      localStorage.setItem(TOKEN_KEY, action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.status = "idle";
        if (action.payload.requires_2fa) {
          state.requires2fa = true;
          state.tempToken = action.payload.temp_token;
          state.phase = "totp";
          state.accessToken = null;
          localStorage.removeItem(TOKEN_KEY);
        } else {
          state.requires2fa = false;
          state.tempToken = null;
          state.phase = "credentials";
          state.accessToken = action.payload.access_token;
          localStorage.setItem(TOKEN_KEY, action.payload.access_token);
        }
      })
      .addCase(login.rejected, (state, action) => {
        state.status = "failed";
        state.error = (action.payload as string) ?? "Credenciais inválidas.";
      })
      .addCase(verify2fa.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(verify2fa.fulfilled, (state, action) => {
        state.status = "idle";
        state.accessToken = action.payload.access_token;
        state.tempToken = null;
        state.requires2fa = false;
        state.phase = "credentials";
        localStorage.setItem(TOKEN_KEY, action.payload.access_token);
      })
      .addCase(verify2fa.rejected, (state, action) => {
        state.status = "failed";
        state.error = (action.payload as string) ?? "Código 2FA incorreto ou expirado.";
      })
      .addCase(loadCurrentUser.pending, (state) => {
        state.profileStatus = "loading";
      })
      .addCase(loadCurrentUser.fulfilled, (state, action) => {
        state.profileStatus = "idle";
        state.currentUser = action.payload;
      })
      .addCase(loadCurrentUser.rejected, (state) => {
        state.profileStatus = "failed";
        state.currentUser = null;
      });
  },
});

export const { logout, resetLoginFlow, setAccessToken } = authSlice.actions;
export default authSlice.reducer;