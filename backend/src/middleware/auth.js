import { verifyToken } from '../lib/jwt.js';
import { ApiError } from '../lib/http.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError(401, 'Authentication required'));
  }
  try {
    const payload = verifyToken(token);
    req.user = { id: Number(payload.sub), role: payload.role, email: payload.email };
    return next();
  } catch {
    return next(new ApiError(401, 'Invalid or expired token'));
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return next(new ApiError(403, 'Administrator access required'));
  }
  return next();
}
