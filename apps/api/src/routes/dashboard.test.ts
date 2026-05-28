import request from "supertest";
import { buildApp } from "../app.js";
import { disconnect, resetDb } from "../test/setup.js";
import { makeEmployee, makeVehicle } from "../test/factories.js";
import { loginAs } from "../test/helpers.js";

const app = buildApp();

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await disconnect();
});

describe("dashboard", () => {
  test("admin sees company-wide stats", async () => {
    await makeEmployee({ role: "ADMIN", username: "admin1" });
    const u1 = await makeEmployee({ role: "USER", username: "u1", department: "A" });
    const u2 = await makeEmployee({ role: "USER", username: "u2", department: "B" });
    await makeVehicle({ ownerId: u1.id, status: "AVAILABLE" });
    await makeVehicle({ ownerId: u1.id, status: "MAINTENANCE" });
    await makeVehicle({ ownerId: u2.id, status: "AVAILABLE" });
    await makeVehicle({ ownerId: null, status: "AVAILABLE" });

    const session = await loginAs(app, "admin1");
    const res = await request(app)
      .get("/api/dashboard/summary")
      .set("Cookie", session.cookies);
    expect(res.status).toBe(200);
    expect(res.body.cards.totalVehicles).toBe(4);
    expect(res.body.cards.availableVehicles).toBe(3);
    expect(res.body.cards.maintenanceVehicles).toBe(1);
    expect(res.body.cards.retiredVehicles).toBe(0);
    expect(res.body.cards.totalEmployees).toBe(3);
    expect(res.body.charts.statusDistribution).toEqual(
      expect.arrayContaining([
        { status: "AVAILABLE", count: 3 },
        { status: "MAINTENANCE", count: 1 },
        { status: "RETIRED", count: 0 },
      ]),
    );
    const byDept = res.body.charts.vehiclesByDepartment as Array<{
      department: string;
      count: number;
    }>;
    expect(byDept).toEqual(
      expect.arrayContaining([
        { department: "A", count: 2 },
        { department: "B", count: 1 },
        { department: "未指派", count: 1 },
      ]),
    );
    expect(res.body.charts.vehiclesTrendLast12Months.length).toBe(12);
    const last =
      res.body.charts.vehiclesTrendLast12Months[
        res.body.charts.vehiclesTrendLast12Months.length - 1
      ];
    const now = new Date();
    const expectedLast = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    expect(last.month).toBe(expectedLast);
  });

  test("user sees only their own; omits employee/department fields", async () => {
    await makeEmployee({ role: "ADMIN", username: "admin1" });
    const u1 = await makeEmployee({ role: "USER", username: "u1" });
    const u2 = await makeEmployee({ role: "USER", username: "u2" });
    await makeVehicle({ ownerId: u1.id });
    await makeVehicle({ ownerId: u2.id });
    await makeVehicle({ ownerId: u2.id });

    const session = await loginAs(app, "u1");
    const res = await request(app)
      .get("/api/dashboard/summary")
      .set("Cookie", session.cookies);
    expect(res.status).toBe(200);
    expect(res.body.cards.totalVehicles).toBe(1);
    expect(res.body.cards.totalEmployees).toBeUndefined();
    expect(res.body.charts.vehiclesByDepartment).toBeUndefined();
    expect(res.body.charts.vehiclesTrendLast12Months.length).toBe(12);
  });

  test("INACTIVE employees not counted in totalEmployees", async () => {
    await makeEmployee({ role: "ADMIN", username: "admin1" });
    await makeEmployee({ role: "USER", username: "u-active" });
    await makeEmployee({ role: "USER", username: "u-inactive", status: "INACTIVE" });
    const session = await loginAs(app, "admin1");
    const res = await request(app)
      .get("/api/dashboard/summary")
      .set("Cookie", session.cookies);
    expect(res.body.cards.totalEmployees).toBe(2);
  });
});
