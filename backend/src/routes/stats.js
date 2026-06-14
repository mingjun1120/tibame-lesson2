import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';

const VEHICLE_STATUSES = ['available', 'in_use', 'maintenance', 'retired'];

const router = Router();

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const [vehicles, totalEmployees] = await Promise.all([
      prisma.vehicle.findMany({ select: { status: true, brand: true } }),
      prisma.employee.count(),
    ]);

    const statusCounts = Object.fromEntries(VEHICLE_STATUSES.map((s) => [s, 0]));
    const brandCounts = {};
    for (const v of vehicles) {
      statusCounts[v.status] = (statusCounts[v.status] ?? 0) + 1;
      brandCounts[v.brand] = (brandCounts[v.brand] ?? 0) + 1;
    }

    res.json({
      cards: {
        totalVehicles: vehicles.length,
        available: statusCounts.available,
        maintenance: statusCounts.maintenance,
        totalEmployees,
      },
      charts: {
        statusDistribution: VEHICLE_STATUSES.map((status) => ({ status, count: statusCounts[status] })),
        byBrand: Object.entries(brandCounts)
          .map(([brand, count]) => ({ brand, count }))
          .sort((a, b) => b.count - a.count),
      },
    });
  }),
);

export default router;
