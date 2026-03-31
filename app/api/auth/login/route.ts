import { z } from "zod";
import { createSessionToken } from "../../../../src/lib/auth/session";
import { setSessionCookie } from "../../../../src/lib/auth/cookies";
import { validateCredentials } from "../../../../src/lib/auth/config";

const BodySchema = z.object({
  username: z.string().min(3).max(64),
  password: z.string().min(8).max(128),
});

export async function POST(req: Request) {
  try {
    const body = BodySchema.parse(await req.json());
    const check = validateCredentials(body.username, body.password);

    if (!check.ok) {
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = await createSessionToken(body.username, check.role);
    await setSessionCookie(token);

    return Response.json({ ok: true, role: check.role });
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
}
