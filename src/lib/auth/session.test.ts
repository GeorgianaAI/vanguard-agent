import { describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { createSessionToken, verifySessionToken } from "./session";

function keyFromEnv(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

describe("auth session", () => {
  it("signs and verifies a token", async () => {
    process.env.AUTH_SESSION_SECRET = "test-secret-1234567890";
    process.env.AUTH_SESSION_TTL_SECONDS = "28800";

    const token = await createSessionToken("admin", "admin");
    const claims = await verifySessionToken(token);

    expect(claims).not.toBeNull();
    expect(claims?.sub).toBe("admin");
    expect(claims?.role).toBe("admin");
    expect(typeof claims?.iat).toBe("number");
    expect(typeof claims?.exp).toBe("number");
  });

  it("rejects tampered token", async () => {
    process.env.AUTH_SESSION_SECRET = "test-secret-1234567890";
    process.env.AUTH_SESSION_TTL_SECONDS = "28800";

    const token = await createSessionToken("admin", "admin");
    const tampered = `${token}x`;

    const claims = await verifySessionToken(tampered);
    expect(claims).toBeNull();
  });

  it("rejects expired token", async () => {
    process.env.AUTH_SESSION_SECRET = "test-secret-1234567890";

    const now = Math.floor(Date.now() / 1000);
    const expired = await new SignJWT({ role: "admin" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("admin")
      .setIssuedAt(now - 120)
      .setExpirationTime(now - 60)
      .sign(keyFromEnv(process.env.AUTH_SESSION_SECRET));

    const claims = await verifySessionToken(expired);
    expect(claims).toBeNull();
  });
});
