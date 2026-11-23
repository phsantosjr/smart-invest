import { describe, expect, it, beforeEach } from "vitest";

import authReducer, { login, logout } from "../src/features/auth/authSlice";

const TOKEN_KEY = "smart-invest-access-token";

const idleState = {
  accessToken: null as string | null,
  tempToken: null as string | null,
  requires2fa: false,
  phase: "credentials" as const,
  status: "idle" as const,
  error: null as string | null,
};

describe("authSlice", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("sets requires2fa and tempToken when login requires 2FA", () => {
    const state = authReducer(
      { ...idleState, status: "loading" },
      login.fulfilled(
        {
          requires_2fa: true,
          temp_token: "challenge-jwt",
          message: "Insira o código de autenticação de 2 fatores.",
        },
        "",
        { email: "a@b.com", password: "x" },
      ),
    );

    expect(state.requires2fa).toBe(true);
    expect(state.tempToken).toBe("challenge-jwt");
    expect(state.accessToken).toBeNull();
    expect(state.phase).toBe("totp");
    expect(state.status).toBe("idle");
  });

  it("persists accessToken on login without 2FA", () => {
    const token = "access-jwt";
    const state = authReducer(
      { ...idleState, status: "loading" },
      login.fulfilled(
        { requires_2fa: false, access_token: token, token_type: "bearer" },
        "",
        { email: "a@b.com", password: "x" },
      ),
    );

    expect(state.accessToken).toBe(token);
    expect(state.requires2fa).toBe(false);
    expect(localStorage.getItem(TOKEN_KEY)).toBe(token);
  });

  it("clears access token on logout", () => {
    localStorage.setItem(TOKEN_KEY, "access-jwt");
    const state = authReducer(
      {
        ...idleState,
        accessToken: "access-jwt",
        tempToken: "temp",
        requires2fa: true,
        phase: "totp",
      },
      logout(),
    );
    expect(state.accessToken).toBeNull();
    expect(state.tempToken).toBeNull();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });
});