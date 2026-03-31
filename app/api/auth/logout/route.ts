import { clearSessionCookie } from "../../../../src/lib/auth/cookies";

export async function POST() {
  await clearSessionCookie();
  return Response.json({ ok: true });
}
