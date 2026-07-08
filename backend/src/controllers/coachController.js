import asyncHandler from 'express-async-handler';
import Coach from '../models/Coach.js';
import { ApiError } from '../utils/ApiError.js';
import { writeAuditLog } from '../utils/audit.js';

function normalizeCoachPayload(body) {
  const specialties = Array.isArray(body.specialties)
    ? body.specialties
    : String(body.specialties || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

  return {
    name: String(body.name || '').trim(),
    email: String(body.email || '').trim().toLowerCase(),
    bio: String(body.bio || '').trim(),
    photoUrl: String(body.photoUrl || '').trim(),
    specialties
  };
}

export const listCoaches = asyncHandler(async (req, res) => {
  const search = String(req.query.search || '').trim();
  const filter = search
    ? {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { bio: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      }
    : {};

  const coaches = await Coach.find(filter).sort({ name: 1 }).limit(100);
  res.json(coaches);
});

export const createCoach = asyncHandler(async (req, res) => {
  const payload = normalizeCoachPayload(req.body);
  if (!payload.name) {
    throw new ApiError(400, 'Coach name is required', 'VALIDATION_ERROR', ['name']);
  }

  const coach = await Coach.create(payload);
  await writeAuditLog({
    actor: req.user._id,
    action: 'coach.created',
    targetType: 'Coach',
    targetId: coach._id,
    metadata: { name: coach.name }
  });

  res.status(201).json(coach);
});

export const updateCoach = asyncHandler(async (req, res) => {
  const coach = await Coach.findById(req.params.id);
  if (!coach) {
    throw new ApiError(404, 'Coach not found', 'COACH_NOT_FOUND');
  }

  const payload = normalizeCoachPayload(req.body);
  if (!payload.name) {
    throw new ApiError(400, 'Coach name is required', 'VALIDATION_ERROR', ['name']);
  }

  Object.assign(coach, payload);
  await coach.save();
  await writeAuditLog({
    actor: req.user._id,
    action: 'coach.updated',
    targetType: 'Coach',
    targetId: coach._id,
    metadata: { name: coach.name }
  });

  res.json(coach);
});
