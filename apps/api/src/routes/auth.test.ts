import request from "supertest";
import { buildApp } from "../app.js";
import { prisma } from "../db/prisma.js";
import { disconnect, resetDb } from "../test/setup.js";
import { makeEmployee } from "../test/factories.js";
import { loginAs } from "../test/helpers.js";

const app = buildApp();

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await disconnect();
});

describe("auth", () => {
  test("POST /api/auth/register returns 404", async () => {
    const res = await request(app).post("/api/auth/register").send({});
    expect(res.status).toBe(404);
  });

  test("login success returns user and csrfToken", async () => {
    await makeEmployee({ username: "alice", password: "password123" });
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "alice", password: "password123" });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("USER");
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.csrfToken).toEqual(expect.any(String));
    expect(res.headers["set-cookie"]?.[0]).toMatch(/HttpOnly/i);
  });

  test("invalid credentials -> 401 INVALID_CREDENTIALS", async () => {
    await makeEmployee({ username: "alice", password: "password123" });
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "alice", password: "wrong" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  test("5 failed attempts locks the account", async () => {
    const emp = await makeEmployee({ username: "alice", password: "password123" });
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ username: "alice", password: "wrong" });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
    }
    const after = await prisma.employee.findUnique({ where: { id: emp.id } });
    expect(after?.failedLoginCount).toBe(5);
    expect(after?.lockedUntil?.getTime()).toBeGreaterThan(Date.now());

    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "alice", password: "password123" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("ACCOUNT_LOCKED");
    expect(res.body.error.details.unlockAt).toEqual(expect.any(String));
  });

  test("successful login resets failed count", async () => {
    const emp = await makeEmployee({ username: "alice", password: "password123" });
    await prisma.employee.update({
      where: { id: emp.id },
      data: { failedLoginCount: 3 },
    });
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "alice", password: "password123" });
    expect(res.status).toBe(200);
    const after = await prisma.employee.findUnique({ where: { id: emp.id } });
    expect(after?.failedLoginCount).toBe(0);
    expect(after?.lockedUntil).toBeNull();
  });

  test("INACTIVE employee cannot log in", async () => {
    await makeEmployee({ username: "alice", password: "password123", status: "INACTIVE" });
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "alice", password: "password123" });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("ACCOUNT_INACTIVE");
  });

  test("GET /api/auth/me without cookie -> 401", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  test("GET /api/auth/me with cookie -> 200", async () => {
    const emp = await makeEmployee({ username: "alice", password: "password123" });
    const session = await loginAs(app, "alice");
    const res = await request(app)
      .get("/api/auth/me")
      .set("Cookie", session.cookies);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(emp.email);
  });

  test("logout without csrf -> 403", async () => {
    await makeEmployee({ username: "alice", password: "password123" });
    const session = await loginAs(app, "alice");
    const res = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", session.cookies);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("CSRF_TOKEN_MISSING");
  });

  test("logout with csrf -> 204", async () => {
    await makeEmployee({ username: "alice", password: "password123" });
    const session = await loginAs(app, "alice");
    const res = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", session.cookies)
      .set("X-CSRF-Token", session.csrf);
    expect(res.status).toBe(204);
  });
});
