import asyncHandler from 'express-async-handler';
import Coach from '../models/Coach.js';
import ClassModel from '../models/Class.js';
import { ApiError } from '../utils/ApiError.js';
import { writeAuditLog } from '../utils/audit.js';

function normalizeCoachPayload(body) {
  const specialties = Array.isArray(body.specialties)
    ? body.specialties
    : String(body.specialties || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  const certificates = Array.isArray(body.certificates)
    ? body.certificates
    : String(body.certificates || '')
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);

  return {
    name: String(body.name || '').trim(),
    email: String(body.email || '').trim().toLowerCase(),
    title: String(body.title || '').trim(),
    phone: String(body.phone || '').trim(),
    birthday: String(body.birthday || '').trim(),
    gender: String(body.gender || '').trim(),
    bio: String(body.bio || '').trim(),
    photoUrl: String(body.photoUrl || '').trim(),
    specialties,
    certificates,
    yearsExperience: Math.max(Number(body.yearsExperience || 0), 0)
  };
}

async function ensureCoachEmailAvailable(email, excludeCoachId = null) {
  if (!email) return;

  const existing = await Coach.findOne({
    email,
    ...(excludeCoachId ? { _id: { $ne: excludeCoachId } } : {})
  }).select('_id');

  if (existing) {
    throw new ApiError(409, 'Coach email is already in use', 'COACH_EMAIL_ALREADY_EXISTS', ['email']);
  }
}

async function attachCoachStats(coaches) {
  const coachIds = coaches.map((coach) => coach._id);
  const classQuery = coachIds.length ? { coach: { $in: coachIds } } : null;
  const [upcomingClasses, allClasses] = classQuery
    ? await Promise.all([
      ClassModel.find({ ...classQuery, startDate: { $gte: new Date() } })
        .select('title startDate schedule location level coach maxStudents')
        .sort({ startDate: 1 })
        .lean(),
      ClassModel.find(classQuery)
        .select('coach maxStudents')
        .lean()
    ])
    : [[], []];
  const scheduleMap = new Map();
  upcomingClasses.forEach((classItem) => {
    const key = classItem.coach?.toString();
    if (!key) return;
    const list = scheduleMap.get(key) || [];
    if (list.length < 5) list.push(classItem);
    scheduleMap.set(key, list);
  });
  const classCountMap = new Map();
  const studentCapacityMap = new Map();
  allClasses.forEach((classItem) => {
    const key = classItem.coach?.toString();
    if (!key) return;
    classCountMap.set(key, (classCountMap.get(key) || 0) + 1);
    studentCapacityMap.set(key, (studentCapacityMap.get(key) || 0) + Number(classItem.maxStudents || 0));
  });

  return coaches.map((coach) => ({
    ...coach,
    teachingSchedule: scheduleMap.get(coach._id.toString()) || [],
    classCount: classCountMap.get(coach._id.toString()) || 0,
    totalStudents: studentCapacityMap.get(coach._id.toString()) || 0
  }));
}

export const listCoaches = asyncHandler(async (req, res) => {
  const search = String(req.query.search || '').trim();
  const pageNumber = Math.max(Number(req.query.page || 1), 1);
  const limitNumber = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
  const startIndex = (pageNumber - 1) * limitNumber;
  const isEmailSearch = search.includes('@');
  const filter = search
    ? isEmailSearch
      ? { email: search.toLowerCase() }
      : { $text: { $search: search } }
    : {};
  const projection = search && !isEmailSearch ? { score: { $meta: 'textScore' } } : {};
  const sort = search && !isEmailSearch ? { score: { $meta: 'textScore' }, name: 1 } : { name: 1 };

  const [coaches, total] = await Promise.all([
    Coach.find(filter, projection).sort(sort).skip(startIndex).limit(limitNumber).lean(),
    Coach.countDocuments(filter)
  ]);

  res.json({
    data: await attachCoachStats(coaches),
    pagination: {
      page: pageNumber,
      limit: limitNumber,
      total,
      pages: Math.ceil(total / limitNumber)
    }
  });
});

export const getCoachById = asyncHandler(async (req, res) => {
  const coach = await Coach.findById(req.params.id).lean();
  if (!coach) {
    throw new ApiError(404, 'Coach not found', 'COACH_NOT_FOUND');
  }

  const [payload] = await attachCoachStats([coach]);
  res.json(payload);
});

export const createCoach = asyncHandler(async (req, res) => {
  const payload = normalizeCoachPayload(req.body);
  if (!payload.name) {
    throw new ApiError(400, 'Coach name is required', 'VALIDATION_ERROR', ['name']);
  }
  await ensureCoachEmailAvailable(payload.email);

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

  const isOwnCoachProfile = req.user?.role === 'coach' && coach.email && coach.email === req.user.email;
  if (req.user?.role !== 'admin' && !isOwnCoachProfile) {
    throw new ApiError(403, 'Only admins or the assigned coach can edit this profile.', 'COACH_UPDATE_FORBIDDEN');
  }

  const payload = normalizeCoachPayload(req.body);
  if (!payload.name) {
    throw new ApiError(400, 'Coach name is required', 'VALIDATION_ERROR', ['name']);
  }
  await ensureCoachEmailAvailable(payload.email, coach._id);

  Object.assign(coach, payload);
  await coach.save();
  await writeAuditLog({
    actor: req.user._id,
    action: 'coach.updated',
    targetType: 'Coach',
    targetId: coach._id,
    metadata: { name: coach.name }
  });

  const [coachWithStats] = await attachCoachStats([coach.toObject()]);
  res.json(coachWithStats);
});
