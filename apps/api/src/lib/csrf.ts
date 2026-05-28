import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./env.js";

export function deriveCsrf(token: string): string {
  return createHmac("sha256", env.COOKIE_SECRET).update(token).digest("hex");
}

export function csrfMatches(token: string, candidate: string): boolean {
  const expected = Buffer.from(deriveCsrf(token));
  const given = Buffer.from(candidate);
  if (expected.length !== given.length) return false;
  return timingSafeEqual(expected, given);
}
