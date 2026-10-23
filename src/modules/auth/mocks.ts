import { http, HttpResponse } from "msw";
import { env } from "@/config/env";
import type { LoginResponse, User } from "./types";

/**
 * Usuarios de prueba (solo existen en los mocks). Coinciden con los usuarios 1 y 10
 * de Administración > Usuarios. El almacenero tiene los permisos del rol "Almacenero / Logística".
 */
const MOCK_ACCOUNTS: { email: string; password: string; user: User }[] = [
  {
    email: "admin@enterprise.com",
    password: "admin123",
    user: {
      id: "00000000-0000-4000-8010-000000000001",
      name: "Gabriel Romero",
      email: "admin@enterprise.com",
      role: "Administrador",
      permissions: ["*"],
    },
  },
  {
    email: "almacen@enterprise.com",
    password: "almacen123",
    user: {
      id: "00000000-0000-4000-8010-000000000010",
      name: "Alan Reyes Cabrera",
      email: "almacen@enterprise.com",
      role: "Almacenero / Logística",
      permissions: [
        "inventory.adjustments:create",
        "inventory.adjustments:edit",
        "inventory.adjustments:view",
        "inventory.kardex:view",
        "inventory.stock:view",
        "inventory.transfers:create",
        "inventory.transfers:edit",
        "inventory.transfers:view",
        "inventory.transfers:void",
        "purchases.receptions:create",
        "purchases.receptions:view",
        "purchases.receptions:void",
      ],
    },
  },
];

/**
 * El refresh token real es una cookie HttpOnly que pone el backend. El navegador no deja
 * simular HttpOnly, así que el mock usa una cookie normal con el correo de la sesión:
 * basta para que F5 recupere la sesión. El código de la app nunca lee esta cookie.
 */
const REFRESH_COOKIE = "erp_mock_refresh";

const session = (user: User): LoginResponse => ({
  token: `mock-access-token-${user.id}`,
  user,
});

const unauthorized = (code: string, message: string) =>
  HttpResponse.json({ code, message }, { status: 401 });

export const authHandlers = [
  http.post(`${env.apiBaseUrl}/auth/login`, async ({ request }) => {
    // Un cuerpo inválido se trata como credenciales vacías: responde 401, nunca 500
    const body = ((await request.json().catch(() => ({}))) ?? {}) as { email?: string; password?: string };
    const account = MOCK_ACCOUNTS.find(
      (candidate) => candidate.email === body.email && candidate.password === body.password,
    );
    if (!account) return unauthorized("INVALID_CREDENTIALS", "Credenciales inválidas.");

    return HttpResponse.json(session(account.user), {
      headers: { "Set-Cookie": `${REFRESH_COOKIE}=${encodeURIComponent(account.email)}; Path=/; SameSite=Strict` },
    });
  }),

  http.post(`${env.apiBaseUrl}/auth/refresh`, ({ cookies }) => {
    const email = cookies[REFRESH_COOKIE];
    const account = MOCK_ACCOUNTS.find((candidate) => candidate.email === email);
    if (!account) return unauthorized("SESSION_EXPIRED", "Tu sesión expiró. Inicia sesión nuevamente.");
    return HttpResponse.json(session(account.user));
  }),

  http.post(`${env.apiBaseUrl}/auth/logout`, () => {
    return new HttpResponse(null, {
      status: 204,
      headers: { "Set-Cookie": `${REFRESH_COOKIE}=; Path=/; Max-Age=0; SameSite=Strict` },
    });
  }),
];
