/**
 * Minimal single-owner admin auth for Phase 1.
 *
 * There is intentionally no backend/customer auth system yet — this is a
 * development-only gate for the single NEOZY-INVI owner account. The
 * session flag lives in sessionStorage only (cleared when the tab closes)
 * and is never rendered anywhere on the public-facing /demo route.
 *
 * Dev credentials (NOT shown on any public page):
 *   admin@neozy.in / admin123
 */
const SESSION_KEY = "neozy-invi:admin-session";
const DEV_EMAIL = "admin@neozy.in";
const DEV_PASSWORD = "admin123";

export function attemptLogin(email: string, password: string): boolean {
  const ok = email.trim().toLowerCase() === DEV_EMAIL && password === DEV_PASSWORD;
  if (ok) {
    sessionStorage.setItem(SESSION_KEY, "1");
  }
  return ok;
}

export function isAdminAuthenticated(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function logoutAdmin(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}
