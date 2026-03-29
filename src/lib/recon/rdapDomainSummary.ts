const RDAP_API_BASE = "https://rdap.org/domain";

/**
 * Public RDAP lookup (same source as LangGraph domain_whois tool).
 * Returns a compact JSON string for agents / MCP.
 */
export async function lookupDomainRdapJson(domain: string): Promise<string> {
  const normalizedDomain = domain.trim().toLowerCase();

  const response = await fetch(
    `${RDAP_API_BASE}/${encodeURIComponent(normalizedDomain)}`,
    {
      method: "GET",
      headers: {
        accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`RDAP request failed (${response.status}): ${text}`);
  }

  const rdap = (await response.json()) as {
    ldhName?: string;
    status?: string[];
    entities?: Array<{
      roles?: string[];
      vcardArray?: unknown[];
    }>;
    events?: Array<{
      eventAction?: string;
      eventDate?: string;
    }>;
  };

  const registrarEntity = (rdap.entities ?? []).find((e) =>
    (e.roles ?? []).includes("registrar"),
  );

  let registrar = "unknown";
  const vcard = registrarEntity?.vcardArray;
  if (Array.isArray(vcard) && Array.isArray(vcard[1])) {
    const fnRow = (vcard[1] as unknown[]).find(
      (row) => Array.isArray(row) && row[0] === "fn",
    ) as unknown[] | undefined;
    if (fnRow && typeof fnRow[3] === "string") {
      registrar = fnRow[3];
    }
  }

  const keyEvents = (rdap.events ?? [])
    .filter((e) =>
      ["registration", "expiration", "last changed"].includes(
        (e.eventAction ?? "").toLowerCase(),
      ),
    )
    .map((e) => ({
      action: e.eventAction ?? "unknown",
      date: e.eventDate ?? "unknown",
    }));

  const flattened = {
    domain: rdap.ldhName ?? normalizedDomain,
    registrar,
    status: rdap.status ?? [],
    events: keyEvents,
  };

  return JSON.stringify(flattened);
}
