type ThreadInput = Request | URLSearchParams;

function toSearchParams(input: ThreadInput): URLSearchParams {
  return input instanceof URLSearchParams ? input : new URL(input.url).searchParams;
}

export function requireActorId(req: Request): string | null {
  const actorId = req.headers.get("x-actor-id")?.trim();
  return actorId ? actorId : null;
}

export function readActorContext(req: Request): {
  actorId: string | null;
  actorRole: string | null;
} {
  const actorId = req.headers.get("x-actor-id")?.trim() ?? null;
  const actorRole = req.headers.get("x-actor-role")?.trim() ?? null;
  return { actorId, actorRole };
}

export function requireThreadId(input: ThreadInput): string | null {
  const threadId = toSearchParams(input).get("thread_id")?.trim();
  return threadId ? threadId : null;
}
