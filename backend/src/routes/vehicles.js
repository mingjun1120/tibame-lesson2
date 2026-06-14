import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { ApiError, asyncHandler, parseId } from '../lib/http.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const VEHICLE_STATUSES = ['available', 'in_use', 'maintenance', 'retired'];

function buildVehicleData(body, { partial }) {
  const out = {};

  const setString = (key) => {
    if (body[key] === undefined) return;
    if (typeof body[key] !== 'string' || body[key].trim() === '') {
      throw new ApiError(400, `${key} must be a non-empty string`);
    }
    out[key] = body[key].trim();
  };
  ['plateNo', 'brand', 'model'].forEach(setString);

  if (body.year !== undefined) {
    const year = Number(body.year);
    if (!Number.isInteger(year) || year < 1900 || year > 2100) {
      throw new ApiError(400, 'year must be a valid year between 1900 and 2100');
    }
    out.year = year;
  }

  if (body.status !== undefined) {
    if (!VEHICLE_STATUSES.includes(body.status)) {
      throw new ApiError(400, `status must be one of: ${VEHICLE_STATUSES.join(', ')}`);
    }
    out.status = body.status;
  }

  if (body.mileage !== undefined) {
    const mileage = Number(body.mileage);
    if (!Number.isInteger(mileage) || mileage < 0) {
      throw new ApiError(400, 'mileage must be a non-negative integer');
    }
    out.mileage = mileage;
  }

  if (body.purchaseDate === null || body.purchaseDate === '') {
    out.purchaseDate = null;
  } else if (body.purchaseDate !== undefined) {
    const date = new Date(body.purchaseDate);
    if (Number.isNaN(date.getTime())) throw new ApiError(400, 'purchaseDate must be a valid date');
    out.purchaseDate = date;
  }

  if (!partial) {
    for (const key of ['plateNo', 'brand', 'model', 'year']) {
      if (out[key] === undefined) throw new ApiError(400, `${key} is required`);
    }
  }

  return out;
}

const router = Router();

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const search = req.query.search ? String(req.query.search) : '';
    const where = search
      ? {
          OR: [
            { plateNo: { contains: search, mode: 'insensitive' } },
            { brand: { contains: search, mode: 'insensitive' } },
            { model: { contains: search, mode: 'insensitive' } },
          ],
        }
      : undefined;
    const vehicles = await prisma.vehicle.findMany({ where, orderBy: { id: 'desc' } });
    res.json({ vehicles });
  }),
);

router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const vehicle = await prisma.vehicle.findUnique({ where: { id: parseId(req.params.id) } });
    if (!vehicle) throw new ApiError(404, 'Vehicle not found');
    res.json({ vehicle });
  }),
);

router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = buildVehicleData(req.body ?? {}, { partial: false });
    const existing = await prisma.vehicle.findUnique({ where: { plateNo: data.plateNo } });
    if (existing) throw new ApiError(400, 'A vehicle with this plate number already exists');
    const vehicle = await prisma.vehicle.create({ data });
    res.status(201).json({ vehicle });
  }),
);

router.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const existing = await prisma.vehicle.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, 'Vehicle not found');

    const data = buildVehicleData(req.body ?? {}, { partial: true });
    if (data.plateNo && data.plateNo !== existing.plateNo) {
      const dup = await prisma.vehicle.findUnique({ where: { plateNo: data.plateNo } });
      if (dup) throw new ApiError(400, 'A vehicle with this plate number already exists');
    }
    const vehicle = await prisma.vehicle.update({ where: { id }, data });
    res.json({ vehicle });
  }),
);

router.delete(
  '/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const existing = await prisma.vehicle.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, 'Vehicle not found');
    await prisma.vehicle.delete({ where: { id } });
    res.json({ success: true });
  }),
);

export default router;
