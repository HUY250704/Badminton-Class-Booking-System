import asyncHandler from 'express-async-handler';
import ClassModel from '../models/Class.js';
import Enrollment from '../models/Enrollment.js';

async function attachCounts(classes, userId) {
  const ids = classes.map((item) => item._id);
  const counts = await Enrollment.aggregate([
    { $match: { class: { $in: ids } } },
    { $group: { _id: '$class', currentStudents: { $sum: 1 } } }
  ]);
  const countMap = new Map(counts.map((item) => [item._id.toString(), item.currentStudents]));

  let userEnrollments = new Set();
  if (userId) {
    const enrollments = await Enrollment.find({ user: userId, class: { $in: ids } }).select('class');
    userEnrollments = new Set(enrollments.map((item) => item.class.toString()));
  }

  return classes.map((item) => {
    const json = item.toObject();
    return {
      ...json,
      currentStudents: countMap.get(item._id.toString()) || 0,
      isEnrolled: userEnrollments.has(item._id.toString())
    };
  });
}

export const getClasses = asyncHandler(async (req, res) => {
  const { search = '', level = '', page = 1, limit = 9 } = req.query;
  const pageNumber = Math.max(Number(page), 1);
  const limitNumber = Math.min(Math.max(Number(limit), 1), 50);
  const includePast = req.query.includePast === 'true' && req.user?.role === 'admin';

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

  const [classes, total] = await Promise.all([
    ClassModel.find(filter)
      .populate('createdBy', 'name email')
      .sort({ startDate: 1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber),
    ClassModel.countDocuments(filter)
  ]);

  res.json({
    data: await attachCounts(classes, req.user?._id),
    pagination: {
      page: pageNumber,
      limit: limitNumber,
      total,
      pages: Math.ceil(total / limitNumber)
    }
  });
});

export const getClassById = asyncHandler(async (req, res) => {
  const classItem = await ClassModel.findById(req.params.id).populate('createdBy', 'name email');

  if (!classItem) {
    res.status(404);
    throw new Error('Class not found');
  }

  const [payload] = await attachCounts([classItem], req.user?._id);
  res.json(payload);
});

export const createClass = asyncHandler(async (req, res) => {
  const classItem = await ClassModel.create({
    ...req.body,
    createdBy: req.user._id
  });

  const created = await classItem.populate('createdBy', 'name email');
  const [payload] = await attachCounts([created], req.user._id);
  res.status(201).json(payload);
});

export const updateClass = asyncHandler(async (req, res) => {
  const classItem = await ClassModel.findById(req.params.id);

  if (!classItem) {
    res.status(404);
    throw new Error('Class not found');
  }

  if (req.body.maxStudents !== undefined) {
    const nextMaxStudents = Number(req.body.maxStudents);
    const currentStudents = await Enrollment.countDocuments({ class: classItem._id });

    if (nextMaxStudents < currentStudents) {
      res.status(400);
      throw new Error('Max students cannot be lower than current enrollments');
    }
  }

  const fields = ['title', 'description', 'coachName', 'level', 'startDate', 'schedule', 'location', 'maxStudents'];
  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      classItem[field] = req.body[field];
    }
  });

  await classItem.save();
  const populated = await classItem.populate('createdBy', 'name email');
  const [payload] = await attachCounts([populated], req.user._id);
  res.json(payload);
});

export const deleteClass = asyncHandler(async (req, res) => {
  const classItem = await ClassModel.findById(req.params.id);

  if (!classItem) {
    res.status(404);
    throw new Error('Class not found');
  }

  await Enrollment.deleteMany({ class: classItem._id });
  await classItem.deleteOne();
  res.json({ message: 'Class deleted' });
});

export const getClassStudents = asyncHandler(async (req, res) => {
  const classItem = await ClassModel.findById(req.params.id);

  if (!classItem) {
    res.status(404);
    throw new Error('Class not found');
  }

  const enrollments = await Enrollment.find({ class: classItem._id })
    .populate('user', 'name email role')
    .sort({ enrolledAt: -1 });

  res.json(enrollments.map((item) => ({
    id: item._id,
    enrolledAt: item.enrolledAt,
    user: item.user
  })));
});
