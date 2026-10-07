import { http, HttpResponse } from "msw";
import { env } from "@/config/env";

export const authHandlers = [
  http.post(`${env.apiBaseUrl}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };

    if (body.email === "admin@enterprise.com" && body.password === "admin123") {
      return HttpResponse.json({
        token: "mock-jwt-token-12345",
        user: {
          id: "00000000-0000-4000-8010-000000000001",
          name: "Gabriel Romero",
          email: "admin@enterprise.com",
          role: "Administrador",
          permissions: ["*"],
        },
      });
    }

    return HttpResponse.json(
      {
        code: "INVALID_CREDENTIALS",
        message: "Credenciales inválidas.",
      },
      { status: 401 },
    );
  }),

  http.post(`${env.apiBaseUrl}/auth/logout`, () => {
    return new HttpResponse(null, { status: 204 });
  }),
];