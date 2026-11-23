import type {
  LoginRequest,
  LoginResponse,
  TwoFactorVerifyRequest,
  TwoFactorVerifyResponse,
} from "../types/auth";
import type { UserProfile } from "../types/user";
import api from "./api";

export async function login(body: LoginRequest): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>("/auth/login", body);
  return data;
}

export async function verify2fa(body: TwoFactorVerifyRequest): Promise<TwoFactorVerifyResponse> {
  const { data } = await api.post<TwoFactorVerifyResponse>("/auth/2fa/verify", body);
  return data;
}

export async function fetchMe(): Promise<UserProfile> {
  const { data } = await api.get<UserProfile>("/auth/me");
  return data;
}