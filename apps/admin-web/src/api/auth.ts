import { api, tokenStore } from "./client";
import type { UserOut } from "./types";

interface TokenResponse {
  accessToken: string;
  tokenType: string;
}

export async function login(username: string, password: string): Promise<void> {
  const res = await api.post<TokenResponse>("/auth/login", { username, password });
  tokenStore.set(res.accessToken);
}

export const getMe = (): Promise<UserOut> => api.get<UserOut>("/auth/me");
