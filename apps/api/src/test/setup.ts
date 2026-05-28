import { prisma } from "../db/prisma.js";

export async function resetDb() {
  await prisma.vehicle.deleteMany();
  await prisma.employee.deleteMany();
}

export async function disconnect() {
  await prisma.$disconnect();
}
