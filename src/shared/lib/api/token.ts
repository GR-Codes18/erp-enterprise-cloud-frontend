let memoryToken: string | null = null;
let unauthorizedListener: (() => void) | null = null;

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