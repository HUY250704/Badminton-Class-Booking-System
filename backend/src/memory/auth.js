import jwt from 'jsonwebtoken';
import { memory } from './store.js';

export function memoryProtect(req, res, next) {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    res.status(401);
    next(new Error('Not authorized, token missing'));
    return;
  }

  try {
    const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    const user = memory.users.find((item) => item._id === decoded.id);

    if (!user) {
      res.status(401);
      next(new Error('Not authorized, user not found'));
      return;
    }

    if ((user.tokenVersion || 0) !== (decoded.tokenVersion || 0)) {
      res.status(401);
      next(new Error('Session expired. Please log in again.'));
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(401);
    next(new Error('Not authorized, invalid token'));
  }
}

export function memoryAdminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    res.status(403);
    next(new Error('Admin access required'));
    return;
  }

  next();
}

export function memoryOptionalAuth(req, _res, next) {
  const header = req.headers.authorization;

  if (header?.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
      const user = memory.users.find((item) => item._id === decoded.id) || null;
      req.user = user && (user.tokenVersion || 0) === (decoded.tokenVersion || 0) ? user : null;
    } catch {
      req.user = null;
    }
  }

  next();
}
