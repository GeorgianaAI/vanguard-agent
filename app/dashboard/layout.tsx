import type { ReactNode } from "react";

/** Dashboard imports AI transport code that reads Vercel OIDC sync during SSR; static prerender has no request headers. */
export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return children;
}
