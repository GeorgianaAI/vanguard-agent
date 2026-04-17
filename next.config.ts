import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(nextConfig, {
  // Upload source maps to Sentry at build time (requires SENTRY_AUTH_TOKEN, SENTRY_ORG, SENTRY_PROJECT)
  silent: !process.env.CI,

  // Automatically tree-shake Sentry logger in production builds
  disableLogger: true,

  // Tunnel Sentry requests through /monitoring to avoid ad-blocker interference
  tunnelRoute: "/monitoring",

  // Widen the sourcemap upload scope to catch all generated files
  widenClientFileUpload: true,
});
