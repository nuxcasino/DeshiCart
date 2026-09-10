import { NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  clearSessionCookieHeader,
  destroySession,
} from "@/lib/auth";

export async function POST(request: Request) {
  const header = request.headers.get("cookie") ?? "";
  const token = header
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  await destroySession(token ? decodeURIComponent(token) : null);
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", clearSessionCookieHeader());
  return res;
}
