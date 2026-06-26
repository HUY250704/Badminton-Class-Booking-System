import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { signToken } from '../utils/token.js';

function authPayload(user) {
  return {
    token: signToken(user),
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  };
}

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    throw new ApiError(409, 'Email is already registered', 'EMAIL_ALREADY_REGISTERED', ['email']);
  }

  const user = await User.create({ name, email, password });
  res.status(201).json(authPayload(user));
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    throw new ApiError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
  }

  res.json(authPayload(user));
});

export const me = asyncHandler(async (req, res) => {
  res.json({
    id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role
  });
});
