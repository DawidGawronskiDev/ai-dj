import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, sameOrigin, secureCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: secureCookie(request),
    path: "/",
    maxAge: 0,
  });
  return response;
}
