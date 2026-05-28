import type { Employee } from "@prisma/client";

export type PublicEmployee = Omit<
  Employee,
  "passwordHash" | "failedLoginCount" | "lockedUntil"
>;

export function publicEmployee(e: Employee): PublicEmployee {
  const { passwordHash: _ph, failedLoginCount: _fc, lockedUntil: _lu, ...rest } = e;
  return rest;
}
