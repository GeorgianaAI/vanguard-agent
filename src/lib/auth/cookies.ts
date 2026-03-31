import { cookies } from "next/headers";
import { getAuthCookieName } from "./config";

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(getAuthCookieName(), token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(getAuthCookieName());
}
