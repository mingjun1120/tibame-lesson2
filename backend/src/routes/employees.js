import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { ApiError, asyncHandler, parseId } from '../lib/http.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { toPublicEmployee } from '../lib/serialize.js';

const ROLES = ['admin', 'user'];
const STATUSES = ['active', 'inactive'];

function buildEmployeeData(body, { partial }) {
  const out = {};

  const setString = (key, { allowNull = false } = {}) => {
    if (body[key] === undefined) return;
    if (allowNull && (body[key] === null || body[key] === '')) {
      out[key] = null;
      return;
    }
    if (typeof body[key] !== 'string' || body[key].trim() === '') {
      throw new ApiError(400, `${key} must be a non-empty string`);
    }
    out[key] = body[key].trim();
  };

  setString('name');
  if (body.email !== undefined) {
    if (typeof body.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      throw new ApiError(400, 'email must be a valid email address');
    }
    out.email = body.email.trim().toLowerCase();
  }
  if (body.role !== undefined) {
    if (!ROLES.includes(body.role)) throw new ApiError(400, `role must be one of: ${ROLES.join(', ')}`);
    out.role = body.role;
  }
  if (body.status !== undefined) {
    if (!STATUSES.includes(body.status)) {
      throw new ApiError(400, `status must be one of: ${STATUSES.join(', ')}`);
    }
    out.status = body.status;
  }
  ['department', 'position', 'phone'].forEach((key) => setString(key, { allowNull: true }));

  if (body.hireDate === null || body.hireDate === '') {
    out.hireDate = null;
  } else if (body.hireDate !== undefined) {
    const date = new Date(body.hireDate);
    if (Number.isNaN(date.getTime())) throw new ApiError(400, 'hireDate must be a valid date');
    out.hireDate = date;
  }

  if (!partial) {
    for (const key of ['name', 'email', 'role']) {
      if (out[key] === undefined) throw new ApiError(400, `${key} is required`);
    }
  }

  return out;
}

function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 6) {
    throw new ApiError(400, 'password must be at least 6 characters');
  }
}

const router = Router();
router.use(requireAuth, requireAdmin);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const employees = await prisma.employee.findMany({ orderBy: { id: 'asc' } });
    res.json({ employees: employees.map(toPublicEmployee) });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const employee = await prisma.employee.findUnique({ where: { id: parseId(req.params.id) } });
    if (!employee) throw new ApiError(404, 'Employee not found');
    res.json({ employee: toPublicEmployee(employee) });
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = req.body ?? {};
    const data = buildEmployeeData(body, { partial: false });
    validatePassword(body.password);

    const dup = await prisma.employee.findUnique({ where: { email: data.email } });
    if (dup) throw new ApiError(400, 'An employee with this email already exists');

    data.passwordHash = await bcrypt.hash(body.password, 10);
    const employee = await prisma.employee.create({ data });
    res.status(201).json({ employee: toPublicEmployee(employee) });
  }),
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, 'Employee not found');

    const body = req.body ?? {};
    const data = buildEmployeeData(body, { partial: true });

    if (data.email && data.email !== existing.email) {
      const dup = await prisma.employee.findUnique({ where: { email: data.email } });
      if (dup) throw new ApiError(400, 'An employee with this email already exists');
    }
    if (body.password !== undefined) {
      validatePassword(body.password);
      data.passwordHash = await bcrypt.hash(body.password, 10);
    }

    const employee = await prisma.employee.update({ where: { id }, data });
    res.json({ employee: toPublicEmployee(employee) });
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = parseId(req.params.id);
    if (id === req.user.id) {
      throw new ApiError(400, 'You cannot delete your own account');
    }
    const existing = await prisma.employee.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, 'Employee not found');
    await prisma.employee.delete({ where: { id } });
    res.json({ success: true });
  }),
);

export default router;
