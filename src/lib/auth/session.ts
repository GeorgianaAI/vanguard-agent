import { SignJWT, jwtVerify } from "jose";
import { getAuthSecret, getAuthTtlSeconds } from "./config";
import type { OperatorRole, SessionClaims } from "./types";

function key(): Uint8Array {
  return new TextEncoder().encode(getAuthSecret());
}

export async function createSessionToken(username: string, role: OperatorRole): Promise<string> {
  const ttl = getAuthTtlSeconds();
  const now = Math.floor(Date.now() / 1000);

  return await new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(username)
    .setIssuedAt(now)
    .setExpirationTime(now + ttl)
    .sign(key());
}

export async function verifySessionToken(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, key(), {
      algorithms: ["HS256"],
    });
    if (typeof payload.sub !== "string") return null;
    const role = payload.role;
    if (role !== "admin" && role !== "analyst" && role !== "viewer") return null;
    if (typeof payload.iat !== "number" || typeof payload.exp !== "number") return null;

    return {
      sub: payload.sub,
      role,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}
