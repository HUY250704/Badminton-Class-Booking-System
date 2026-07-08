import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import ClassModel from '../models/Class.js';
import Enrollment from '../models/Enrollment.js';
import Waitlist from '../models/Waitlist.js';
import { ApiError } from '../utils/ApiError.js';
import { writeAuditLog } from '../utils/audit.js';
import { sendEmail } from '../utils/email.js';

const activeEnrollmentFilter = { status: { $ne: 'cancelled' } };

async function promoteNextWaitlistedStudent(classId, session) {
  const nextWaitlist = await Waitlist.findOne({ class: classId, status: 'waiting' })
    .sort({ joinedAt: 1 })
    .session(session);

  if (!nextWaitlist) return null;

  let enrollment = await Enrollment.findOne({ class: classId, user: nextWaitlist.user }).session(session);
  if (enrollment) {
    enrollment.status = 'active';
    enrollment.cancelledAt = null;
    await enrollment.save({ session });
  } else {
    [enrollment] = await Enrollment.create([
      { class: classId, user: nextWaitlist.user, status: 'active' }
    ], { session });
  }

  nextWaitlist.status = 'promoted';
  nextWaitlist.promotedAt = new Date();
  await nextWaitlist.save({ session });

  return enrollment;
}

export const enrollInClass = asyncHandler(async (req, res) => {
  const classId = req.params.id;
  const classItem = await ClassModel.findById(classId);

  if (!classItem) {
    throw new ApiError(404, 'Class not found', 'CLASS_NOT_FOUND');
  }

  if (classItem.startDate <= new Date()) {
    throw new ApiError(400, 'Cannot enroll in a class that has already started.', 'CLASS_ALREADY_STARTED');
  }

  // Use a transaction when available to avoid race conditions causing over-enrollment.
  let enrollment;
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const existing = await Enrollment.findOne({ class: classId, user: req.user._id }).session(session);
      if (existing?.status === 'cancelled') {
        throw new ApiError(409, 'This class was cancelled earlier and cannot be re-enrolled.', 'ENROLLMENT_ALREADY_CANCELLED');
      }
      if (existing) {
        throw new ApiError(409, 'You are already enrolled in this class', 'ALREADY_ENROLLED');
      }

      const currentStudents = await Enrollment.countDocuments({ class: classId, ...activeEnrollmentFilter }).session(session);
      if (currentStudents >= classItem.maxStudents) {
        throw new ApiError(409, 'Class is already full', 'CLASS_FULL');
      }

      enrollment = await Enrollment.create([{ class: classId, user: req.user._id, status: 'active' }], { session });
      // Enrollment.create with array returns an array
      enrollment = enrollment[0];
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new ApiError(409, 'You are already enrolled in this class', 'ALREADY_ENROLLED');
    }
    throw error;
  } finally {
    session.endSession();
  }

  res.status(201).json(enrollment);

  await sendEmail({
    to: req.user.email,
    subject: 'Class registration confirmed',
    text: `Hi ${req.user.name},\n\nYou are registered for ${classItem.title}.\nSchedule: ${classItem.schedule}\nLocation: ${classItem.location}`
  });
});

export const cancelEnrollment = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  let cancelled = null;
  let alreadyCancelled = false;

  try {
    await session.withTransaction(async () => {
      const classItem = await ClassModel.findById(req.params.id).session(session);
      if (!classItem) {
        throw new ApiError(404, 'Class not found', 'CLASS_NOT_FOUND');
      }

      const enrollment = await Enrollment.findOne({
        class: req.params.id,
        user: req.user._id
      }).session(session);

      if (!enrollment || enrollment.status === 'cancelled') {
        alreadyCancelled = true;
        return;
      }

      enrollment.status = 'cancelled';
      enrollment.cancelledAt = new Date();
      cancelled = await enrollment.save({ session });
      await promoteNextWaitlistedStudent(req.params.id, session);
    });
  } finally {
    session.endSession();
  }

  if (alreadyCancelled) {
    res.json({
      message: 'This class was already cancelled earlier.',
      alreadyCancelled: true
    });
    return;
  }

  res.json({ message: 'Enrollment cancelled', enrollment: cancelled });
});

export const myEnrollments = asyncHandler(async (req, res) => {
  const enrollments = await Enrollment.find({ user: req.user._id, ...activeEnrollmentFilter })
    .populate({
      path: 'class',
      populate: { path: 'createdBy', select: 'name email' }
    })
    .sort({ enrolledAt: -1 });

  const classIds = enrollments.filter((item) => item.class).map((item) => item.class._id);
  const counts = await Enrollment.aggregate([
    { $match: { class: { $in: classIds }, status: { $ne: 'cancelled' } } },
    { $group: { _id: '$class', currentStudents: { $sum: 1 } } }
  ]);
  const countMap = new Map(counts.map((item) => [item._id.toString(), item.currentStudents]));

  res.json(enrollments.map((item) => ({
    id: item._id,
    enrolledAt: item.enrolledAt,
    class: item.class ? {
      ...item.class.toObject(),
      currentStudents: countMap.get(item.class._id.toString()) || 0,
      isEnrolled: true
    } : null
  })));
});
