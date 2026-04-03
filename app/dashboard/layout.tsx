import type { ReactNode } from "react";

/** Dynamic segment; AI SDK may touch Vercel OIDC during SSR — e2e sets VERCEL_OIDC_TOKEN for build/start. */
export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return children;
}
