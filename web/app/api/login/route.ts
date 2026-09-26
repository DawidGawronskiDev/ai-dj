import { NextRequest, NextResponse } from "next/server";
import {
  COOKIE_NAME,
  createSession,
  sameOrigin,
  secureCookie,
  validPassword,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (
    !input ||
    typeof input !== "object" ||
    typeof (input as { password?: unknown }).password !== "string"
  ) {
    return NextResponse.json(
      { error: "Enter the operator password" },
      { status: 400 },
    );
  }
  try {
    if (!validPassword((input as { password: string }).password)) {
      return NextResponse.json(
        { error: "Incorrect password" },
        { status: 401 },
      );
    }
    const response = NextResponse.json({ ok: true });
    response.cookies.set(COOKIE_NAME, createSession(), {
      httpOnly: true,
      sameSite: "strict",
      secure: secureCookie(request),
      path: "/",
      maxAge: 12 * 60 * 60,
    });
    return response;
  } catch {
    return NextResponse.json(
      { error: "Operator password is not configured" },
      { status: 503 },
    );
  }
}
