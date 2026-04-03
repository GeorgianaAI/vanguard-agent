import type { ReactNode } from "react";

/** Avoid static prerender of the segment; primary dashboard UI is client-only via dynamic(ssr:false). */
export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return children;
}
