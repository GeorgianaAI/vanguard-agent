import * as Sentry from "@sentry/nextjs";

// Edge Runtime has limited Sentry support — basic error capture only, no tracing
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  debug: false,
});
