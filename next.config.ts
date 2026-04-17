import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Upload source maps to Sentry at build time (requires SENTRY_AUTH_TOKEN)
  silent: !process.env.CI,

  // Automatically tree-shake Sentry logger in production builds
  disableLogger: true,

  // Tunnel Sentry requests through /monitoring to avoid ad-blocker interference
  tunnelRoute: "/monitoring",

  // Widen the sourcemap upload scope to catch all generated files
  widenClientFileUpload: true,
});
