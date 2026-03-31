import { z } from "zod";
import type { OperatorRecord, OperatorRole } from "./types";

const OperatorSchema = z.object({
  username: z.string().min(3).max(64),
  password: z.string().min(8).max(128),
  role: z.enum(["admin", "analyst", "viewer"]),
});

const OperatorsSchema = z.array(OperatorSchema).min(1);

export function getAuthSecret(): string {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret) throw new Error("Missing AUTH_SESSION_SECRET");
  return secret;
}

export function getAuthTtlSeconds(): number {
  const raw = process.env.AUTH_SESSION_TTL_SECONDS ?? "28800";
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 300) {
    throw new Error("Invalid AUTH_SESSION_TTL_SECONDS");
  }
  return parsed;
}

export function getAuthCookieName(): string {
  return process.env.AUTH_COOKIE_NAME ?? "vanguard_session";
}

export function getOperators(): OperatorRecord[] {
  const raw = process.env.AUTH_OPERATORS_JSON;
  if (!raw) throw new Error("Missing AUTH_OPERATORS_JSON");
  const parsed = JSON.parse(raw);
  return OperatorsSchema.parse(parsed);
}

export function resolveRole(username: string): OperatorRole | null {
  const op = getOperators().find((o) => o.username === username);
  return op?.role ?? null;
}

export function validateCredentials(
  username: string,
  password: string,
): { ok: true; role: OperatorRole } | { ok: false } {
  const op = getOperators().find((o) => o.username === username);
  if (!op) return { ok: false };
  if (op.password !== password) return { ok: false };
  return { ok: true, role: op.role };
}
