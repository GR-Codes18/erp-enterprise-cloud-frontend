import { env } from "@/config/env";
import { ApiError, UNKNOWN_ERROR } from "@/shared/lib/api/errors";
import { getAccessToken, notifyUnauthorized, refreshAccessToken } from "@/shared/lib/api/token";
import type { ApiErrorBody, FieldError } from "@/shared/lib/api/types";

type QueryValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryValue>;

interface RequestOptions {
  query?: QueryParams;
  body?: unknown;
  /** TanStack Query entrega una señal para cancelar peticiones obsoletas */
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: QueryParams): string {
  const url = new URL(env.apiBaseUrl + path);

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

function isFieldErrors(value: unknown): value is FieldError[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        typeof item.field === "string" &&
        typeof item.message === "string",
    )
  );
}

function isErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== "object" || value === null) return false;
  const body = value as Record<string, unknown>;
  return typeof body.code === "string" && typeof body.message === "string";
}

async function toApiError(response: Response): Promise<ApiError> {
  try {
    const body: unknown = await response.json();
    if (isErrorBody(body)) {
      const fieldErrors = isFieldErrors(body.errors) ? body.errors : [];
      return new ApiError(response.status, body.code, body.message, fieldErrors);
    }
  } catch {
    // El cuerpo no era JSON: se cae al error genérico
  }

  return new ApiError(response.status, UNKNOWN_ERROR, "HTTP " + response.status);
}

/** Las rutas de sesión no disparan el refresh: un 401 ahí es la respuesta final */
const isAuthPath = (path: string) => path.startsWith("/auth/");

async function request<T>(
  method: string,
  path: string,
  options: RequestOptions = {},
  isRetry = false,
): Promise<T> {
  const { query, body, signal } = options;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const token = getAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
      // Envía la cookie HttpOnly del refresh token (el backend debe permitir credenciales en CORS)
      credentials: "include",
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, "NETWORK_ERROR", "Network request failed");
  }

  // Token vencido: se renueva una vez con la cookie de refresh y se repite la petición.
  // Si no se puede renovar, la sesión terminó.
  if (response.status === 401 && !isAuthPath(path)) {
    if (!isRetry && (await refreshAccessToken())) {
      return request<T>(method, path, options, true);
    }
    notifyUnauthorized();
  }

  if (!response.ok) throw await toApiError(response);

  if (response.status === 204) return undefined as T;

  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError(response.status, "INVALID_RESPONSE", "Invalid JSON response");
  }
}

type ReadOptions = Omit<RequestOptions, "body">;
type WriteOptions = Omit<RequestOptions, "body">;

export const api = {
  get: <T>(path: string, options?: ReadOptions) => request<T>("GET", path, options),
  post: <T>(path: string, body?: unknown, options?: WriteOptions) =>
    request<T>("POST", path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: WriteOptions) =>
    request<T>("PUT", path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: WriteOptions) =>
    request<T>("PATCH", path, { ...options, body }),
  delete: <T = void>(path: string, options?: WriteOptions) =>
    request<T>("DELETE", path, options),
};