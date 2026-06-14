import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { signToken } from '../lib/jwt.js';
import { ApiError, asyncHandler } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import { toPublicEmployee } from '../lib/serialize.js';

const router = Router();

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      throw new ApiError(400, 'Email and password are required');
    }

    const employee = await prisma.employee.findUnique({ where: { email } });
    // Use one generic message for all failures to avoid user enumeration.
    const invalid = new ApiError(401, 'Invalid credentials');
    if (!employee || employee.status !== 'active') throw invalid;

    const ok = await bcrypt.compare(password, employee.passwordHash);
    if (!ok) throw invalid;

    const token = signToken({ sub: employee.id, role: employee.role, email: employee.email });
    res.json({ token, user: toPublicEmployee(employee) });
  }),
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const employee = await prisma.employee.findUnique({ where: { id: req.user.id } });
    if (!employee) throw new ApiError(401, 'User no longer exists');
    res.json({ user: toPublicEmployee(employee) });
  }),
);

export default router;
