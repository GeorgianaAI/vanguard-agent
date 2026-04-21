/**
 * Mirrors POST /api/chat approval branch: reject when checkpoint says approval is stale.
 */
export function shouldRejectApprovalForGraphState(values: Record<string, unknown>): boolean {
  const hasStateSnapshot = Object.keys(values).length > 0;
  if (!hasStateSnapshot) return false;
  const pending = values.isPendingApproval === true;
  const scoutHasRun = values.scoutHasRun === true;
  return !pending || scoutHasRun;
}
