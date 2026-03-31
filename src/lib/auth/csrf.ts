import crypto from "crypto";

const CSRF_COOKIE = "vanguard_csrf";

export function getCsrfCookieName(): string {
  return CSRF_COOKIE;
}

export function newCsrfToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

export function csrfHeaderName(): string {
  return "x-csrf-token";
}
