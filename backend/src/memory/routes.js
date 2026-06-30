import bcrypt from 'bcryptjs';
import express from 'express';
import { validateClassBody, validateClassQuery, validateLogin, validateRegister } from '../middleware/validate.js';
import { ApiError } from '../utils/ApiError.js';
import { signToken } from '../utils/token.js';
import { memoryAdminOnly, memoryOptionalAuth, memoryProtect } from './auth.js';
import { memory, newId } from './store.js';

const router = express.Router();

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role
  };
}

function authPayload(user) {
  return {
    token: signToken(user),
    user: publicUser(user)
  };
}

function classPayload(item, userId) {
  const currentStudents = memory.enrollments.filter((enrollment) => enrollment.class === item._id && enrollment.status !== 'cancelled').length;
  return {
    ...item,
    currentStudents,
    isEnrolled: Boolean(userId && memory.enrollments.some((enrollment) => enrollment.class === item._id && enrollment.user === userId && enrollment.status !== 'cancelled'))
  };
}

router.post('/auth/register', validateRegister, async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (memory.users.some((user) => user.email === email)) {
      throw new ApiError(409, 'Email is already registered', 'EMAIL_ALREADY_REGISTERED', ['email']);
    }

    const user = {
      _id: newId('user'),
      name,
      email,
      password: await bcrypt.hash(password, 10),
      role: 'user',
      tokenVersion: 0
    };
    memory.users.push(user);
    res.status(201).json(authPayload(user));
  } catch (error) {
    next(error);
  }
});

router.post('/auth/login', validateLogin, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = memory.users.find((item) => item.email === email);

    if (!user || !(await bcrypt.compare(password || '', user.password))) {
      throw new ApiError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
    }

    res.json(authPayload(user));
  } catch (error) {
    next(error);
  }
});

router.get('/auth/me', memoryProtect, (req, res) => {
  res.json(publicUser(req.user));
});

router.post('/auth/logout', memoryProtect, (req, res) => {
  req.user.tokenVersion = (req.user.tokenVersion || 0) + 1;
  res.json({ message: 'Logged out' });
});

router.get('/classes', validateClassQuery, memoryOptionalAuth, (req, res) => {
  const { search = '', level = '', page = 1, limit = 9 } = req.query;
  const pageNumber = Math.max(Number(page), 1);
  const limitNumber = Math.min(Math.max(Number(limit), 1), 50);
  const includePast = req.query.includePast === 'true' && req.user?.role === 'admin';
  const term = search.trim().toLowerCase();

  let classes = memory.classes
    .filter((item) => includePast || new Date(item.startDate) >= new Date())
    .filter((item) => !level || item.level === level)
    .filter((item) => {
      if (!term) return true;
      return [item.title, item.coachName, item.description].some((value) => value.toLowerCase().includes(term));
    })
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

  const total = classes.length;
  classes = classes.slice((pageNumber - 1) * limitNumber, pageNumber * limitNumber);

  res.json({
    data: classes.map((item) => classPayload(item, req.user?._id)),
    pagination: {
      page: pageNumber,
      limit: limitNumber,
      total,
      pages: Math.ceil(total / limitNumber)
    }
  });
});

router.post('/classes', memoryProtect, memoryAdminOnly, validateClassBody(), (req, res) => {
  const item = {
    _id: newId('class'),
    title: req.body.title,
    description: req.body.description,
    coachName: req.body.coachName,
    level: req.body.level,
    startDate: new Date(req.body.startDate).toISOString(),
    schedule: req.body.schedule,
    location: req.body.location,
    maxStudents: Number(req.body.maxStudents),
    createdBy: req.user._id,
    updatedAt: new Date().toISOString()
  };
  memory.classes.push(item);
  res.status(201).json(classPayload(item, req.user._id));
});

router.get('/classes/my/enrollments', memoryProtect, (req, res) => {
  const enrollments = memory.enrollments
    .filter((item) => item.user === req.user._id && item.status !== 'cancelled')
    .sort((a, b) => new Date(b.enrolledAt) - new Date(a.enrolledAt))
    .map((item) => {
      const klass = memory.classes.find((classItem) => classItem._id === item.class);
      return {
        id: item._id,
        enrolledAt: item.enrolledAt,
        class: classPayload(klass, req.user._id)
      };
    })
    .filter((item) => item.class);

  res.json(enrollments);
});

router.get('/classes/:id', memoryOptionalAuth, (req, res, next) => {
  const item = memory.classes.find((classItem) => classItem._id === req.params.id);
  if (!item) {
    next(new ApiError(404, 'Class not found', 'CLASS_NOT_FOUND'));
    return;
  }
  res.json(classPayload(item, req.user?._id));
});

router.patch('/classes/:id', memoryProtect, memoryAdminOnly, validateClassBody({ partial: true }), (req, res, next) => {
  const item = memory.classes.find((classItem) => classItem._id === req.params.id);
  if (!item) {
    next(new ApiError(404, 'Class not found', 'CLASS_NOT_FOUND'));
    return;
  }

  if (req.body.updatedAt && item.updatedAt && new Date(req.body.updatedAt).getTime() !== new Date(item.updatedAt).getTime()) {
    next(new ApiError(409, 'Class has been updated by someone else. Please refresh and try again.', 'CLASS_UPDATE_CONFLICT'));
    return;
  }

  const currentStudents = memory.enrollments.filter((enrollment) => enrollment.class === item._id && enrollment.status !== 'cancelled').length;
  if (req.body.maxStudents !== undefined && Number(req.body.maxStudents) < currentStudents) {
    next(new ApiError(400, `This class currently has ${currentStudents} enrolled students. Max students cannot be lower than ${currentStudents}.`, 'MAX_STUDENTS_TOO_LOW', ['maxStudents']));
    return;
  }

  ['title', 'description', 'coachName', 'level', 'schedule', 'location'].forEach((field) => {
    if (req.body[field] !== undefined) item[field] = req.body[field];
  });
  if (req.body.startDate !== undefined) item.startDate = new Date(req.body.startDate).toISOString();
  if (req.body.maxStudents !== undefined) item.maxStudents = Number(req.body.maxStudents);
  item.updatedAt = new Date().toISOString();

  res.json(classPayload(item, req.user._id));
});

router.delete('/classes/:id', memoryProtect, memoryAdminOnly, (req, res, next) => {
  const index = memory.classes.findIndex((item) => item._id === req.params.id);
  if (index === -1) {
    next(new ApiError(404, 'Class not found', 'CLASS_NOT_FOUND'));
    return;
  }

  memory.classes.splice(index, 1);
  memory.enrollments = memory.enrollments.filter((item) => item.class !== req.params.id);
  res.json({ message: 'Class deleted' });
});

router.post('/classes/:id/enroll', memoryProtect, (req, res, next) => {
  const item = memory.classes.find((classItem) => classItem._id === req.params.id);
  if (!item) {
    next(new ApiError(404, 'Class not found', 'CLASS_NOT_FOUND'));
    return;
  }

  if (new Date(item.startDate) <= new Date()) {
    next(new ApiError(400, 'Cannot enroll in a class that has already started.', 'CLASS_ALREADY_STARTED'));
    return;
  }

  const existingEnrollment = memory.enrollments.find((enrollment) => enrollment.class === item._id && enrollment.user === req.user._id);
  if (existingEnrollment?.status === 'cancelled') {
    next(new ApiError(409, 'This class was cancelled earlier and cannot be re-enrolled.', 'ENROLLMENT_ALREADY_CANCELLED'));
    return;
  }

  if (existingEnrollment) {
    next(new ApiError(409, 'You are already enrolled in this class', 'ALREADY_ENROLLED'));
    return;
  }

  const currentStudents = memory.enrollments.filter((enrollment) => enrollment.class === item._id && enrollment.status !== 'cancelled').length;
  if (currentStudents >= item.maxStudents) {
    next(new ApiError(409, 'Class is already full', 'CLASS_FULL'));
    return;
  }

  const enrollment = {
    _id: newId('enroll'),
    class: item._id,
    user: req.user._id,
    enrolledAt: new Date().toISOString(),
    status: 'active',
    cancelledAt: null
  };
  memory.enrollments.push(enrollment);
  res.status(201).json(enrollment);
});

router.delete('/classes/:id/enroll', memoryProtect, (req, res, next) => {
  const klass = memory.classes.find((item) => item._id === req.params.id);
  if (!klass) {
    next(new ApiError(404, 'Class not found', 'CLASS_NOT_FOUND'));
    return;
  }

  const enrollment = memory.enrollments.find((item) => item.class === req.params.id && item.user === req.user._id);
  if (!enrollment || enrollment.status === 'cancelled') {
    res.json({ message: 'This class was already cancelled earlier.', alreadyCancelled: true });
    return;
  }

  enrollment.status = 'cancelled';
  enrollment.cancelledAt = new Date().toISOString();
  res.json({ message: 'Enrollment cancelled' });
});

router.get('/classes/:id/students', memoryProtect, memoryAdminOnly, (req, res, next) => {
  const item = memory.classes.find((classItem) => classItem._id === req.params.id);
  if (!item) {
    next(new ApiError(404, 'Class not found', 'CLASS_NOT_FOUND'));
    return;
  }

  res.json(memory.enrollments
    .filter((enrollment) => enrollment.class === item._id && enrollment.status !== 'cancelled')
    .map((enrollment) => ({
      id: enrollment._id,
      enrolledAt: enrollment.enrolledAt,
      user: publicUser(memory.users.find((user) => user._id === enrollment.user))
    }))
    .filter((enrollment) => enrollment.user));
});

export default router;
