import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const COOKIE_NAME = "subwave_operator";
const SESSION_MS = 12 * 60 * 60 * 1000;

function password(): string {
  const value = process.env.OPERATOR_PASSWORD;
  if (!value) throw new Error("OPERATOR_PASSWORD is not configured");
  return value;
}

function signature(expires: string): string {
  return createHmac("sha256", password())
    .update(`subwave:${expires}`)
    .digest("hex");
}

export function validPassword(input: string): boolean {
  const expected = Buffer.from(password());
  const received = Buffer.from(input);
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}

export function createSession(): string {
  const expires = String(Date.now() + SESSION_MS);
  return `${expires}.${signature(expires)}`;
}

export function validSession(value: string | undefined): boolean {
  if (!value) return false;
  const [expires, mac, extra] = value.split(".");
  if (extra || !expires || !mac || !/^\d+$/.test(expires)) return false;
  if (Number(expires) < Date.now() || Number(expires) > Date.now() + SESSION_MS)
    return false;
  const expected = Buffer.from(signature(expires));
  const received = Buffer.from(mac);
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}

export function authorized(request: NextRequest): boolean {
  return validSession(request.cookies.get(COOKIE_NAME)?.value);
}

export function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const sent = new URL(origin);
    const host =
      request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    return sent.host === host;
  } catch {
    return false;
  }
}

export function secureCookie(request: NextRequest): boolean {
  return (
    (request.headers.get("x-forwarded-proto") ??
      request.nextUrl.protocol.replace(":", "")) === "https"
  );
}
