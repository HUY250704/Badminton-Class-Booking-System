import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import ClassModel from '../models/Class.js';
import Enrollment from '../models/Enrollment.js';
import { ApiError } from '../utils/ApiError.js';

export const enrollInClass = asyncHandler(async (req, res) => {
  const classId = req.params.id;
  const classItem = await ClassModel.findById(classId);

  if (!classItem) {
    throw new ApiError(404, 'Class not found', 'CLASS_NOT_FOUND');
  }

  // Use a transaction when available to avoid race conditions causing over-enrollment.
  let enrollment;
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const existing = await Enrollment.findOne({ class: classId, user: req.user._id }).session(session);
      if (existing) {
        throw new ApiError(409, 'You are already enrolled in this class', 'ALREADY_ENROLLED');
      }

      const currentStudents = await Enrollment.countDocuments({ class: classId }).session(session);
      if (currentStudents >= classItem.maxStudents) {
        throw new ApiError(409, 'Class is already full', 'CLASS_FULL');
      }

      enrollment = await Enrollment.create([{ class: classId, user: req.user._id }], { session });
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
});

export const cancelEnrollment = asyncHandler(async (req, res) => {
  const enrollment = await Enrollment.findOneAndDelete({
    class: req.params.id,
    user: req.user._id
  });

  if (!enrollment) {
    throw new ApiError(404, 'Enrollment not found', 'ENROLLMENT_NOT_FOUND');
  }

  res.json({ message: 'Enrollment cancelled' });
});

export const myEnrollments = asyncHandler(async (req, res) => {
  const enrollments = await Enrollment.find({ user: req.user._id })
    .populate({
      path: 'class',
      populate: { path: 'createdBy', select: 'name email' }
    })
    .sort({ enrolledAt: -1 });

  const counts = await Enrollment.aggregate([
    { $match: { class: { $in: enrollments.map((item) => item.class._id) } } },
    { $group: { _id: '$class', currentStudents: { $sum: 1 } } }
  ]);
  const countMap = new Map(counts.map((item) => [item._id.toString(), item.currentStudents]));

  res.json(enrollments.map((item) => ({
    id: item._id,
    enrolledAt: item.enrolledAt,
    class: {
      ...item.class.toObject(),
      currentStudents: countMap.get(item.class._id.toString()) || 0,
      isEnrolled: true
    }
  })));
});
