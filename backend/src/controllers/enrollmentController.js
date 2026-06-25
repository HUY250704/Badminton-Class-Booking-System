import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import ClassModel from '../models/Class.js';
import Enrollment from '../models/Enrollment.js';

export const enrollInClass = asyncHandler(async (req, res) => {
  const classId = req.params.id;
  const classItem = await ClassModel.findById(classId);

  if (!classItem) {
    res.status(404);
    throw new Error('Class not found');
  }

  // Use a transaction when available to avoid race conditions causing over-enrollment.
  let enrollment;
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const existing = await Enrollment.findOne({ class: classId, user: req.user._id }).session(session);
      if (existing) {
        const err = new Error('You are already enrolled in this class');
        err.status = 409;
        throw err;
      }

      const currentStudents = await Enrollment.countDocuments({ class: classId }).session(session);
      if (currentStudents >= classItem.maxStudents) {
        const err = new Error('Class is already full');
        err.status = 409;
        throw err;
      }

      enrollment = await Enrollment.create([{ class: classId, user: req.user._id }], { session });
      // Enrollment.create with array returns an array
      enrollment = enrollment[0];
    });
  } catch (error) {
    // Translate error thrown inside transaction
    if (error.status === 409) {
      res.status(409);
      throw new Error(error.message);
    }
    if (error.code === 11000) {
      res.status(409);
      throw new Error('You are already enrolled in this class');
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
    res.status(404);
    throw new Error('Enrollment not found');
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
