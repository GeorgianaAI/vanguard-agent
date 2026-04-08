type RequestOptions = {
  method?: string;
  headers?: HeadersInit;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
};

/**
 * Build consistent localhost test requests for route handlers.
 */
export function makeTestRequest(
  path: string,
  opts: RequestOptions = {},
): Request {
  const method = opts.method ?? (opts.body == null ? "GET" : "POST");
  const url = new URL(path, "http://localhost");

  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }

  const headers = new Headers(opts.headers);
  let body: BodyInit | undefined;

  if (opts.body !== undefined) {
    if (!headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
    body = JSON.stringify(opts.body);
  }

  return new Request(url.toString(), { method, headers, body });
}
