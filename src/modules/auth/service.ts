import { api } from "@/shared/lib/api/client";
import type { LoginCredentials } from "./schema";
import type { LoginResponse } from "./types";

export const authService = {
  login: (credentials: LoginCredentials) =>
    api.post<LoginResponse>("/auth/login", credentials),
  logout: () => api.post<void>("/auth/logout"),
};