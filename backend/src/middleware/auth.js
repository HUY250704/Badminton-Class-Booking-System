import asyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

export const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    throw new ApiError(401, 'Not authorized, token missing', 'AUTH_TOKEN_MISSING');
  }

  const token = header.split(' ')[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id);

  if (!user) {
    throw new ApiError(401, 'Not authorized, user not found', 'AUTH_USER_NOT_FOUND');
  }

  req.user = user;
  next();
});

export function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    throw new ApiError(403, 'Admin access required', 'ADMIN_REQUIRED');
  }

  next();
}
