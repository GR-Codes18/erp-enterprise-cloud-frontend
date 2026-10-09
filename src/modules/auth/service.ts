import { api } from "@/shared/lib/api/client";
import type { LoginCredentials } from "./schema";
import type { LoginResponse } from "./types";

export const authService = {
  login: (credentials: LoginCredentials) =>
    api.post<LoginResponse>("/auth/login", credentials),
  /** Token nuevo a partir de la cookie HttpOnly de refresh. 401 si no hay sesión */
  refresh: () => api.post<LoginResponse>("/auth/refresh"),
  logout: () => api.post<void>("/auth/logout"),
};
