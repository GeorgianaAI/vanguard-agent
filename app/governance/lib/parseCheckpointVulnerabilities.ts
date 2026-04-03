import type { VulnerabilityFinding } from "@/src/lib/vulnerability/vulnerabilityFinding";
import { VulnerabilityFindingSchema } from "@/src/lib/vulnerability/vulnerabilityFinding";

/** Parse checkpoint JSON into validated findings (drops invalid rows). */
export function parseCheckpointVulnerabilities(
  raw: unknown,
): VulnerabilityFinding[] {
  if (!Array.isArray(raw)) return [];
  const out: VulnerabilityFinding[] = [];
  for (const item of raw) {
    const p = VulnerabilityFindingSchema.safeParse(item);
    if (p.success) out.push(p.data);
  }
  return out;
}
