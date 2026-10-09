/**
 * Token de acceso SOLO en memoria (nunca localStorage ni sessionStorage).
 * El refresh token no lo toca el frontend: viaja en una cookie HttpOnly que gestiona el backend.
 */
let memoryToken: string | null = null;
let unauthorizedListener: (() => void) | null = null;
let refresher: (() => Promise<boolean>) | null = null;
let inflightRefresh: Promise<boolean> | null = null;

export function getAccessToken(): string | null {
  return memoryToken;
}

export function setAccessToken(token: string | null): void {
  memoryToken = token;
}

export function onUnauthorized(callback: () => void): void {
  unauthorizedListener = callback;
}

export function notifyUnauthorized(): void {
  memoryToken = null;
  if (unauthorizedListener) {
    unauthorizedListener();
  }
}

/** Lo registra el AuthProvider: pide un token nuevo con la cookie de refresh. true = sesión renovada */
export function setTokenRefresher(callback: (() => Promise<boolean>) | null): void {
  refresher = callback;
}

/**
 * Renueva el token una sola vez aunque varias peticiones reciban 401 a la vez:
 * todas esperan la misma promesa y luego reintentan.
 */
export function refreshAccessToken(): Promise<boolean> {
  if (!refresher) return Promise.resolve(false);
  inflightRefresh ??= refresher()
    .catch(() => false)
    .finally(() => {
      inflightRefresh = null;
    });
  return inflightRefresh;
}
