import bcrypt from "bcrypt";
import type { Role } from "@vms/shared";
import { prisma } from "../db/prisma.js";

let seq = 0;

interface MakeEmployeeOptions {
  role?: Role;
  status?: "ACTIVE" | "INACTIVE";
  username?: string;
  password?: string;
  department?: string;
}

export async function makeEmployee(opts: MakeEmployeeOptions = {}) {
  seq += 1;
  const password = opts.password ?? "password123";
  const passwordHash = await bcrypt.hash(password, 4);
  return prisma.employee.create({
    data: {
      employeeNo: `E-${seq.toString().padStart(4, "0")}`,
      name: `員工${seq}`,
      email: `e${seq}@vms.local`,
      department: opts.department ?? "工務",
      position: "工程師",
      hiredAt: new Date("2024-01-01"),
      phone: "0900-000-000",
      status: opts.status ?? "ACTIVE",
      username: opts.username ?? `user${seq}`,
      passwordHash,
      role: opts.role ?? "USER",
    },
  });
}

export async function makeVehicle(
  overrides: Partial<{
    plate: string;
    status: "AVAILABLE" | "MAINTENANCE" | "RETIRED";
    ownerId: string | null;
    purchasedAt: Date;
    mileage: number;
  }> = {},
) {
  seq += 1;
  return prisma.vehicle.create({
    data: {
      plate: overrides.plate ?? `P-${seq.toString().padStart(4, "0")}`,
      make: "Toyota",
      model: "Corolla",
      year: 2024,
      color: "white",
      status: overrides.status ?? "AVAILABLE",
      mileage: overrides.mileage ?? 1000,
      purchasedAt: overrides.purchasedAt ?? new Date("2024-06-01"),
      ownerId: overrides.ownerId ?? null,
    },
  });
}
