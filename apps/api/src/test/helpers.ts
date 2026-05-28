import request from "supertest";
import type { Application } from "express";

export async function loginAs(
  app: Application,
  username: string,
  password = "password123",
) {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ username, password });
  if (res.status !== 200) {
    throw new Error(
      `loginAs failed for ${username}: ${res.status} ${JSON.stringify(res.body)}`,
    );
  }
  const cookieHeader = res.headers["set-cookie"];
  const cookies = Array.isArray(cookieHeader) ? cookieHeader : [cookieHeader];
  return {
    cookies: cookies.filter(Boolean) as string[],
    csrf: res.body.csrfToken as string,
    user: res.body.user,
  };
}

export function withAuth(
  agent: request.Test,
  session: { cookies: string[]; csrf: string },
): request.Test {
  return agent
    .set("Cookie", session.cookies)
    .set("X-CSRF-Token", session.csrf);
}
