import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken } from "./src/lib/auth/session";
import { hasMinRole } from "./src/lib/auth/rbac";

function unauthorized(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const login = new URL("/login", req.url);
  return NextResponse.redirect(login);
}

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function middleware(req: NextRequest) {
  const cookie = req.cookies.get(
    process.env.AUTH_COOKIE_NAME ?? "vanguard_session",
  )?.value;
  if (!cookie) return unauthorized(req);

  const claims = await verifySessionToken(cookie);
  if (!claims) return unauthorized(req);

  const p = req.nextUrl.pathname;

  // dashboard requires at least viewer
  if (p.startsWith("/dashboard")) {
    if (!hasMinRole(claims.role, "viewer")) return forbidden();
  }

  // chat requires analyst+
  if (p.startsWith("/api/chat")) {
    if (!hasMinRole(claims.role, "analyst")) return forbidden();
  }

  // audit export requires admin
  if (p.startsWith("/api/audit/evidence")) {
    if (!hasMinRole(claims.role, "admin")) return forbidden();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/chat", "/api/audit/evidence"],
};
