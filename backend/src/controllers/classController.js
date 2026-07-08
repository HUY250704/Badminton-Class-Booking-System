import asyncHandler from 'express-async-handler';
import ClassModel from '../models/Class.js';
import Enrollment from '../models/Enrollment.js';
import Bookmark from '../models/Bookmark.js';
import Review from '../models/Review.js';
import Waitlist from '../models/Waitlist.js';
import { ApiError } from '../utils/ApiError.js';
import { writeAuditLog } from '../utils/audit.js';

const activeEnrollmentFilter = { status: { $ne: 'cancelled' } };

async function attachCounts(classes, userId) {
  const ids = classes.map((item) => item._id);
  const [counts, waitlistCounts, reviewStats] = await Promise.all([
    Enrollment.aggregate([
      { $match: { class: { $in: ids }, status: { $ne: 'cancelled' } } },
      { $group: { _id: '$class', currentStudents: { $sum: 1 } } }
    ]),
    Waitlist.aggregate([
      { $match: { class: { $in: ids }, status: 'waiting' } },
      { $group: { _id: '$class', waitlistCount: { $sum: 1 } } }
    ]),
    Review.aggregate([
      { $match: { class: { $in: ids } } },
      { $group: { _id: '$class', averageRating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } }
    ])
  ]);
  const countMap = new Map(counts.map((item) => [item._id.toString(), item.currentStudents]));
  const waitlistMap = new Map(waitlistCounts.map((item) => [item._id.toString(), item.waitlistCount]));
  const reviewMap = new Map(reviewStats.map((item) => [item._id.toString(), item]));

  let userEnrollments = new Set();
  let userBookmarks = new Set();
  let userWaitlist = new Set();
  if (userId) {
    const [enrollments, bookmarks, waitlist] = await Promise.all([
      Enrollment.find({ user: userId, class: { $in: ids }, ...activeEnrollmentFilter }).select('class'),
      Bookmark.find({ user: userId, class: { $in: ids } }).select('class'),
      Waitlist.find({ user: userId, class: { $in: ids }, status: 'waiting' }).select('class')
    ]);
    userEnrollments = new Set(enrollments.map((item) => item.class.toString()));
    userBookmarks = new Set(bookmarks.map((item) => item.class.toString()));
    userWaitlist = new Set(waitlist.map((item) => item.class.toString()));
  }

  return classes.map((item) => {
    const json = item.toObject();
    const key = item._id.toString();
    const stats = reviewMap.get(key);
    return {
      ...json,
      currentStudents: countMap.get(key) || 0,
      waitlistCount: waitlistMap.get(key) || 0,
      averageRating: stats ? Math.round(stats.averageRating * 10) / 10 : null,
      reviewCount: stats?.reviewCount || 0,
      isEnrolled: userEnrollments.has(key),
      isBookmarked: userBookmarks.has(key),
      userWaitlisted: userWaitlist.has(key)
    };
  });
}

export const getClasses = asyncHandler(async (req, res) => {
  const {
    search = '',
    level = '',
    page = 1,
    limit = 9,
    minPrice,
    maxPrice,
    startDateFrom,
    startDateTo,
    coach = '',
    location = '',
    coachLocation = '',
    sortBy = 'startDate',
    sortOrder = 'asc'
  } = req.query;
  const pageNumber = Math.max(Number(page), 1);
  const limitNumber = Math.min(Math.max(Number(limit), 1), 1000);
  const includePast = req.query.includePast === 'true';

  const filter = includePast ? {} : { startDate: { $gte: new Date() } };

  if (level) {
    filter.level = level;
  }

  if (search.trim()) {
    filter.$or = [
      { title: { $regex: search.trim(), $options: 'i' } },
      { coachName: { $regex: search.trim(), $options: 'i' } },
      { description: { $regex: search.trim(), $options: 'i' } }
    ];
  }

  if (coach.trim()) {
    filter.coachName = { $regex: coach.trim(), $options: 'i' };
  }

  if (location.trim()) {
    filter.location = { $regex: location.trim(), $options: 'i' };
  }

  if (coachLocation.trim()) {
    const term = coachLocation.trim();
    filter.$and = [
      ...(filter.$and || []),
      {
        $or: [
          { coachName: { $regex: term, $options: 'i' } },
          { location: { $regex: term, $options: 'i' } }
        ]
      }
    ];
  }

  if (minPrice !== undefined) {
    const min = Number(minPrice);
    if (Number.isFinite(min) && min >= 0) {
      filter.price = { ...(filter.price || {}), $gte: min };
    }
  }

  if (maxPrice !== undefined) {
    const max = Number(maxPrice);
    if (Number.isFinite(max) && max >= 0) {
      filter.price = { ...(filter.price || {}), $lte: max };
    }
  }

  if (startDateFrom) {
    const from = new Date(startDateFrom);
    if (!Number.isNaN(from.getTime())) {
      filter.startDate = { ...(filter.startDate || {}), $gte: from };
    }
  }

  if (startDateTo) {
    const to = new Date(startDateTo);
    if (!Number.isNaN(to.getTime())) {
      to.setHours(23, 59, 59, 999);
      filter.startDate = { ...(filter.startDate || {}), $lte: to };
    }
  }

  const [classes, total] = await Promise.all([
    ClassModel.find(filter)
      .populate('createdBy', 'name email')
      .populate('coach', 'name email bio photoUrl specialties')
      .sort({ startDate: 1 }),
    ClassModel.countDocuments(filter)
  ]);

  const enriched = await attachCounts(classes, req.user?._id);
  const direction = sortOrder === 'desc' ? -1 : 1;
  const sortedClasses = [...enriched].sort((left, right) => {
    if (sortBy === 'price') {
      return (Number(left.price ?? 0) - Number(right.price ?? 0)) * direction;
    }

    if (sortBy === 'popularity') {
      return ((right.currentStudents ?? 0) - (left.currentStudents ?? 0)) * direction;
    }

    const leftDate = new Date(left.startDate).getTime();
    const rightDate = new Date(right.startDate).getTime();
    return (leftDate - rightDate) * direction;
  });

  const startIndex = (pageNumber - 1) * limitNumber;
  const pagedClasses = sortedClasses.slice(startIndex, startIndex + limitNumber);

  res.json({
    data: pagedClasses,
    pagination: {
      page: pageNumber,
      limit: limitNumber,
      total,
      pages: Math.ceil(total / limitNumber)
    }
  });
});

export const getClassById = asyncHandler(async (req, res) => {
  const classItem = await ClassModel.findById(req.params.id)
    .populate('createdBy', 'name email')
    .populate('coach', 'name email bio photoUrl specialties');

  if (!classItem) {
    throw new ApiError(404, 'Class not found', 'CLASS_NOT_FOUND');
  }

  const [payload] = await attachCounts([classItem], req.user?._id);
  res.json(payload);
});

export const createClass = asyncHandler(async (req, res) => {
  const overlap = await ClassModel.findOne({
    location: { $regex: `^${req.body.location}$`, $options: 'i' },
    startDate: req.body.startDate
  });

  if (overlap) {
    throw new ApiError(409, 'Another class already uses this location at the same time.', 'CLASS_SCHEDULE_CONFLICT', ['startDate', 'location']);
  }

  const classItem = await ClassModel.create({
    title: req.body.title,
    description: req.body.description,
    coachName: req.body.coachName,
    level: req.body.level,
    startDate: req.body.startDate,
    schedule: req.body.schedule,
    location: req.body.location,
    maxStudents: req.body.maxStudents,
    price: req.body.price ?? 500000,
    imageUrl: req.body.imageUrl || '',
    coach: req.body.coach || null,
    createdBy: req.user._id
  });

  await writeAuditLog({
    actor: req.user._id,
    action: 'class.created',
    targetType: 'Class',
    targetId: classItem._id,
    metadata: { title: classItem.title }
  });

  const created = await classItem.populate([
    { path: 'createdBy', select: 'name email' },
    { path: 'coach', select: 'name email bio photoUrl specialties' }
  ]);
  const [payload] = await attachCounts([created], req.user._id);
  res.status(201).json(payload);
});

export const updateClass = asyncHandler(async (req, res) => {
  const classItem = await ClassModel.findById(req.params.id);

  if (!classItem) {
    throw new ApiError(404, 'Class not found', 'CLASS_NOT_FOUND');
  }

  if (req.body.maxStudents !== undefined) {
    const nextMaxStudents = Number(req.body.maxStudents);
    const currentStudents = await Enrollment.countDocuments({ class: classItem._id, ...activeEnrollmentFilter });

    if (nextMaxStudents < currentStudents) {
      throw new ApiError(
        400,
        `This class currently has ${currentStudents} enrolled students. Max students cannot be lower than ${currentStudents}.`,
        'MAX_STUDENTS_TOO_LOW',
        ['maxStudents']
      );
    }
  }

  if (req.body.updatedAt && new Date(req.body.updatedAt).getTime() !== classItem.updatedAt.getTime()) {
    throw new ApiError(
      409,
      'Class has been updated by someone else. Please refresh and try again.',
      'CLASS_UPDATE_CONFLICT'
    );
  }

  if ((req.body.startDate !== undefined || req.body.location !== undefined)) {
    const nextStartDate = req.body.startDate || classItem.startDate;
    const nextLocation = req.body.location || classItem.location;
    const overlap = await ClassModel.findOne({
      _id: { $ne: classItem._id },
      location: { $regex: `^${nextLocation}$`, $options: 'i' },
      startDate: nextStartDate
    });

    if (overlap) {
      throw new ApiError(409, 'Another class already uses this location at the same time.', 'CLASS_SCHEDULE_CONFLICT', ['startDate', 'location']);
    }
  }

  const fields = ['title', 'description', 'coachName', 'coach', 'level', 'startDate', 'schedule', 'location', 'maxStudents', 'price', 'imageUrl'];
  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      classItem[field] = req.body[field];
    }
  });

  await classItem.save();
  await writeAuditLog({
    actor: req.user._id,
    action: 'class.updated',
    targetType: 'Class',
    targetId: classItem._id,
    metadata: { title: classItem.title }
  });
  const populated = await classItem.populate([
    { path: 'createdBy', select: 'name email' },
    { path: 'coach', select: 'name email bio photoUrl specialties' }
  ]);
  const [payload] = await attachCounts([populated], req.user._id);
  res.json(payload);
});

export const deleteClass = asyncHandler(async (req, res) => {
  const classItem = await ClassModel.findById(req.params.id);

  if (!classItem) {
    throw new ApiError(404, 'Class not found', 'CLASS_NOT_FOUND');
  }

  await Enrollment.deleteMany({ class: classItem._id });
  await classItem.deleteOne();
  await writeAuditLog({
    actor: req.user._id,
    action: 'class.deleted',
    targetType: 'Class',
    targetId: classItem._id,
    metadata: { title: classItem.title }
  });
  res.json({ message: 'Class deleted' });
});

export const getClassStudents = asyncHandler(async (req, res) => {
  const classItem = await ClassModel.findById(req.params.id);

  if (!classItem) {
    throw new ApiError(404, 'Class not found', 'CLASS_NOT_FOUND');
  }

  const enrollments = await Enrollment.find({ class: classItem._id, ...activeEnrollmentFilter })
    .populate('user', 'name email role')
    .sort({ enrolledAt: -1 });

  res.json(enrollments.map((item) => ({
    id: item._id,
    enrolledAt: item.enrolledAt,
    user: item.user
  })));
});

export const removeClassStudent = asyncHandler(async (req, res) => {
  const classItem = await ClassModel.findById(req.params.id);
  if (!classItem) {
    throw new ApiError(404, 'Class not found', 'CLASS_NOT_FOUND');
  }

  const enrollment = await Enrollment.findOne({
    class: classItem._id,
    user: req.params.userId,
    ...activeEnrollmentFilter
  }).populate('user', 'name email');

  if (!enrollment) {
    throw new ApiError(404, 'Student enrollment not found', 'ENROLLMENT_NOT_FOUND');
  }

  enrollment.status = 'cancelled';
  enrollment.cancelledAt = new Date();
  await enrollment.save();

  await writeAuditLog({
    actor: req.user._id,
    action: 'class.student_removed',
    targetType: 'Enrollment',
    targetId: enrollment._id,
    metadata: {
      classId: classItem._id,
      classTitle: classItem.title,
      studentId: enrollment.user?._id || req.params.userId,
      studentEmail: enrollment.user?.email
    }
  });

  res.json({ message: 'Student removed from class' });
});
