import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken } from "./src/lib/auth/session";
import { hasPermission, type Permission } from "./src/lib/auth/permissions";

function unauthorized(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", req.url));
}

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

function shouldBypassAuthForE2E(): boolean {
  return process.env.AUTH_E2E_BYPASS === "true";
}

function routePermission(pathname: string): Permission | null {
  if (pathname.startsWith("/dashboard")) return "ui:access";
  if (pathname.startsWith("/api/chat")) return "mission:run";
  if (pathname.startsWith("/api/audit/evidence")) return "audit:evidence:read";
  return null;
}

export async function middleware(req: NextRequest) {
  if (shouldBypassAuthForE2E()) return NextResponse.next();

  const cookie = req.cookies.get(
    process.env.AUTH_COOKIE_NAME ?? "vanguard_session",
  )?.value;
  if (!cookie) return unauthorized(req);

  const claims = await verifySessionToken(cookie);
  if (!claims) return unauthorized(req);

  const required = routePermission(req.nextUrl.pathname);
  if (required && !hasPermission(claims.role, required)) return forbidden();

  const headers = new Headers(req.headers);
  headers.set("x-actor-id", claims.sub);
  headers.set("x-actor-role", claims.role);

  return NextResponse.next({
    request: { headers },
  });
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/chat",
    "/api/chat/:path*",
    "/api/audit/evidence",
  ],
};
