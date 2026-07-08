import asyncHandler from 'express-async-handler';
import crypto from 'crypto';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { resetPasswordEmail, sendEmail } from '../utils/email.js';
import { signToken } from '../utils/token.js';

function authPayload(user) {
  return {
    token: signToken(user),
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl || '',
      phone: user.phone || ''
    }
  };
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl || '',
    phone: user.phone || ''
  };
}

function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function googleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${clientUrl}/auth/google/callback`;

  if (!clientId || !clientSecret) {
    throw new ApiError(501, 'Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.', 'GOOGLE_OAUTH_NOT_CONFIGURED');
  }

  return { clientId, clientSecret, redirectUri };
}

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    throw new ApiError(409, 'Email is already registered', 'EMAIL_ALREADY_REGISTERED', ['email']);
  }

  const user = await User.create({ name, email, password });
  await sendEmail({
    to: user.email,
    subject: 'Welcome to Lin-Badminton',
    text: `Hi ${user.name},\n\nYour Lin-Badminton account has been created. You can now book classes and track your training history.`
  });
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
  res.json(publicUser(req.user));
});

export const logout = asyncHandler(async (req, res) => {
  req.user.tokenVersion = (req.user.tokenVersion || 0) + 1;
  await req.user.save();
  res.json({ message: 'Logged out' });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  if (!email) {
    throw new ApiError(400, 'Please provide your email address', 'VALIDATION_ERROR', ['email']);
  }

  const user = await User.findOne({ email }).select('+passwordResetToken +passwordResetExpires');
  let devResetUrl = null;

  if (user) {
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = hashResetToken(resetToken);
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    devResetUrl = `${clientUrl}/reset-password?token=${resetToken}`;
    await sendEmail({
      to: user.email,
      subject: 'Reset your Lin-Badminton password',
      text: resetPasswordEmail({ name: user.name, resetUrl: devResetUrl })
    });
  }

  res.json({
    message: 'If that email is registered, a password reset link has been sent.',
    devResetUrl: process.env.NODE_ENV === 'production' ? undefined : devResetUrl
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const token = typeof req.body.token === 'string' ? req.body.token.trim() : '';
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (!token || password.length < 6) {
    throw new ApiError(400, 'Token and a password of at least 6 characters are required', 'VALIDATION_ERROR', ['token', 'password']);
  }

  const user = await User.findOne({
    passwordResetToken: hashResetToken(token),
    passwordResetExpires: { $gt: new Date() }
  }).select('+password +passwordResetToken +passwordResetExpires');

  if (!user) {
    throw new ApiError(400, 'Password reset link is invalid or expired', 'RESET_TOKEN_INVALID');
  }

  user.password = password;
  user.passwordResetToken = null;
  user.passwordResetExpires = null;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  res.json(authPayload(user));
});

export const updateProfile = asyncHandler(async (req, res) => {
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : req.user.name;
  const phone = typeof req.body.phone === 'string' ? req.body.phone.trim() : req.user.phone || '';
  const avatarUrl = typeof req.body.avatarUrl === 'string' ? req.body.avatarUrl.trim() : req.user.avatarUrl || '';

  if (!name || name.length < 2) {
    throw new ApiError(400, 'Name must be at least 2 characters', 'VALIDATION_ERROR', ['name']);
  }

  req.user.name = name;
  req.user.phone = phone;
  req.user.avatarUrl = avatarUrl;
  await req.user.save();

  res.json(publicUser(req.user));
});

export const changePassword = asyncHandler(async (req, res) => {
  const currentPassword = typeof req.body.currentPassword === 'string' ? req.body.currentPassword : '';
  const newPassword = typeof req.body.newPassword === 'string' ? req.body.newPassword : '';

  if (!currentPassword || newPassword.length < 6) {
    throw new ApiError(400, 'Current password and a new password of at least 6 characters are required', 'VALIDATION_ERROR', ['currentPassword', 'newPassword']);
  }

  const user = await User.findById(req.user._id).select('+password');
  if (!user || !(await user.matchPassword(currentPassword))) {
    throw new ApiError(401, 'Current password is incorrect', 'INVALID_CURRENT_PASSWORD');
  }

  user.password = newPassword;
  user.tokenVersion = (user.tokenVersion || 0) + 1;
  await user.save();

  res.json(authPayload(user));
});

export const googleAuthUrl = asyncHandler(async (req, res) => {
  const { clientId, redirectUri } = googleConfig();
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'select_account');

  res.json({ authUrl: url.toString() });
});

export const googleCallback = asyncHandler(async (req, res) => {
  const code = typeof req.body.code === 'string' ? req.body.code : '';
  if (!code) {
    throw new ApiError(400, 'Google authorization code is required', 'VALIDATION_ERROR', ['code']);
  }

  const { clientId, clientSecret, redirectUri } = googleConfig();
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });

  const tokenPayload = await tokenResponse.json();
  if (!tokenResponse.ok) {
    throw new ApiError(400, tokenPayload.error_description || 'Google OAuth token exchange failed', 'GOOGLE_TOKEN_EXCHANGE_FAILED');
  }

  const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokenPayload.access_token}` }
  });
  const profile = await profileResponse.json();
  if (!profileResponse.ok || !profile.email) {
    throw new ApiError(400, 'Could not read Google profile', 'GOOGLE_PROFILE_FAILED');
  }

  let user = await User.findOne({ email: profile.email.toLowerCase() });
  if (user) {
    user.googleId = user.googleId || profile.sub;
    user.avatarUrl = user.avatarUrl || profile.picture || '';
    await user.save();
  } else {
    user = await User.create({
      name: profile.name || profile.email.split('@')[0],
      email: profile.email.toLowerCase(),
      password: crypto.randomBytes(24).toString('hex'),
      googleId: profile.sub,
      avatarUrl: profile.picture || ''
    });
  }

  res.json(authPayload(user));
});
