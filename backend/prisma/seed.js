import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const employees = [
  {
    name: 'System Admin',
    email: 'admin@example.com',
    password: 'admin123',
    role: 'admin',
    department: 'IT',
    position: 'System Administrator',
    phone: '0900-000-001',
    hireDate: new Date('2022-01-10'),
  },
  {
    name: 'Alice Wang',
    email: 'alice@example.com',
    password: 'user123',
    role: 'user',
    department: 'Logistics',
    position: 'Fleet Coordinator',
    phone: '0900-000-002',
    hireDate: new Date('2023-03-15'),
  },
  {
    name: 'Bob Chen',
    email: 'bob@example.com',
    password: 'user123',
    role: 'user',
    department: 'Operations',
    position: 'Driver',
    phone: '0900-000-003',
    hireDate: new Date('2023-07-01'),
  },
];

const vehicles = [
  { plateNo: 'ABC-1234', brand: 'Toyota', model: 'Corolla', year: 2021, status: 'available', mileage: 32000, purchaseDate: new Date('2021-05-01') },
  { plateNo: 'ABC-5678', brand: 'Toyota', model: 'RAV4', year: 2022, status: 'in_use', mileage: 18000, purchaseDate: new Date('2022-02-20') },
  { plateNo: 'DEF-1111', brand: 'Honda', model: 'CR-V', year: 2020, status: 'maintenance', mileage: 54000, purchaseDate: new Date('2020-09-12') },
  { plateNo: 'DEF-2222', brand: 'Honda', model: 'Civic', year: 2023, status: 'available', mileage: 8000, purchaseDate: new Date('2023-01-05') },
  { plateNo: 'GHI-3333', brand: 'Ford', model: 'Focus', year: 2019, status: 'retired', mileage: 120000, purchaseDate: new Date('2019-06-30') },
  { plateNo: 'GHI-4444', brand: 'Ford', model: 'Transit', year: 2022, status: 'in_use', mileage: 41000, purchaseDate: new Date('2022-08-18') },
  { plateNo: 'JKL-5555', brand: 'Nissan', model: 'Leaf', year: 2023, status: 'available', mileage: 6000, purchaseDate: new Date('2023-04-22') },
  { plateNo: 'JKL-6666', brand: 'Tesla', model: 'Model 3', year: 2024, status: 'in_use', mileage: 3000, purchaseDate: new Date('2024-02-10') },
];

async function main() {
  for (const { password, ...employee } of employees) {
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.employee.upsert({
      where: { email: employee.email },
      update: {},
      create: { ...employee, passwordHash },
    });
  }

  for (const vehicle of vehicles) {
    await prisma.vehicle.upsert({
      where: { plateNo: vehicle.plateNo },
      update: {},
      create: vehicle,
    });
  }

  const [employeeCount, vehicleCount] = await Promise.all([
    prisma.employee.count(),
    prisma.vehicle.count(),
  ]);
  console.log(`Seed complete: ${employeeCount} employees, ${vehicleCount} vehicles`);
  console.log('Login as admin -> admin@example.com / admin123');
  console.log('Login as user  -> alice@example.com / user123');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
