const DOMAIN_RE = /^(?=.{1,253}$)(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+\.?$/i;

export function normalizeTargetInput(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return "";

  const withoutScheme = trimmed.replace(/^https?:\/\//, "");
  const host = withoutScheme.split("/")[0] ?? "";
  // Remove trailing punctuation users often type accidentally.
  return host.replace(/[.,;:!?]+$/g, "");
}

export function validateTargetInput(raw: string): {
  normalized: string;
  error: string | null;
} {
  const normalized = normalizeTargetInput(raw);

  if (!normalized) {
    // Empty target is allowed; backend falls back to DEFAULT_TARGET.
    return { normalized, error: null };
  }

  if (!DOMAIN_RE.test(normalized)) {
    return {
      normalized,
      error:
        "Enter a valid domain (letters/numbers/hyphens + dot), e.g. openai.com",
    };
  }

  return { normalized, error: null };
}
