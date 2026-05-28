import type { Response } from "express";
import { isProd } from "./env.js";

export const AUTH_COOKIE = "vms_token";

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: 8 * 60 * 60 * 1000,
  });
}

export function clearAuthCookie(res: Response): void {
  res.cookie(AUTH_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: 0,
  });
}
