import bcrypt from 'bcryptjs';
import express from 'express';
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
  const currentStudents = memory.enrollments.filter((enrollment) => enrollment.class === item._id).length;
  return {
    ...item,
    currentStudents,
    isEnrolled: Boolean(userId && memory.enrollments.some((enrollment) => enrollment.class === item._id && enrollment.user === userId))
  };
}

router.post('/auth/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400);
      throw new Error('Name, email, and password are required');
    }

    if (memory.users.some((user) => user.email.toLowerCase() === email.toLowerCase())) {
      res.status(409);
      throw new Error('Email is already registered');
    }

    const user = {
      _id: newId('user'),
      name,
      email,
      password: await bcrypt.hash(password, 10),
      role: 'user'
    };
    memory.users.push(user);
    res.status(201).json(authPayload(user));
  } catch (error) {
    next(error);
  }
});

router.post('/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = memory.users.find((item) => item.email.toLowerCase() === String(email || '').toLowerCase());

    if (!user || !(await bcrypt.compare(password || '', user.password))) {
      res.status(401);
      throw new Error('Invalid email or password');
    }

    res.json(authPayload(user));
  } catch (error) {
    next(error);
  }
});

router.get('/auth/me', memoryProtect, (req, res) => {
  res.json(publicUser(req.user));
});

router.get('/classes', memoryOptionalAuth, (req, res) => {
  const { search = '', level = '', page = 1, limit = 9 } = req.query;
  const pageNumber = Math.max(Number(page), 1);
  const limitNumber = Math.min(Math.max(Number(limit), 1), 50);
  const term = search.trim().toLowerCase();

  let classes = memory.classes
    .filter((item) => new Date(item.startDate) >= new Date())
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

router.post('/classes', memoryProtect, memoryAdminOnly, (req, res) => {
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
    createdBy: req.user._id
  };
  memory.classes.push(item);
  res.status(201).json(classPayload(item, req.user._id));
});

router.get('/classes/my/enrollments', memoryProtect, (req, res) => {
  const enrollments = memory.enrollments
    .filter((item) => item.user === req.user._id)
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
    res.status(404);
    next(new Error('Class not found'));
    return;
  }
  res.json(classPayload(item, req.user?._id));
});

router.patch('/classes/:id', memoryProtect, memoryAdminOnly, (req, res, next) => {
  const item = memory.classes.find((classItem) => classItem._id === req.params.id);
  if (!item) {
    res.status(404);
    next(new Error('Class not found'));
    return;
  }

  const currentStudents = memory.enrollments.filter((enrollment) => enrollment.class === item._id).length;
  if (req.body.maxStudents !== undefined && Number(req.body.maxStudents) < currentStudents) {
    res.status(400);
    next(new Error('Max students cannot be lower than current enrollments'));
    return;
  }

  ['title', 'description', 'coachName', 'level', 'schedule', 'location'].forEach((field) => {
    if (req.body[field] !== undefined) item[field] = req.body[field];
  });
  if (req.body.startDate !== undefined) item.startDate = new Date(req.body.startDate).toISOString();
  if (req.body.maxStudents !== undefined) item.maxStudents = Number(req.body.maxStudents);

  res.json(classPayload(item, req.user._id));
});

router.delete('/classes/:id', memoryProtect, memoryAdminOnly, (req, res, next) => {
  const index = memory.classes.findIndex((item) => item._id === req.params.id);
  if (index === -1) {
    res.status(404);
    next(new Error('Class not found'));
    return;
  }

  memory.classes.splice(index, 1);
  memory.enrollments = memory.enrollments.filter((item) => item.class !== req.params.id);
  res.json({ message: 'Class deleted' });
});

router.post('/classes/:id/enroll', memoryProtect, (req, res, next) => {
  const item = memory.classes.find((classItem) => classItem._id === req.params.id);
  if (!item) {
    res.status(404);
    next(new Error('Class not found'));
    return;
  }

  if (memory.enrollments.some((enrollment) => enrollment.class === item._id && enrollment.user === req.user._id)) {
    res.status(409);
    next(new Error('You are already enrolled in this class'));
    return;
  }

  const currentStudents = memory.enrollments.filter((enrollment) => enrollment.class === item._id).length;
  if (currentStudents >= item.maxStudents) {
    res.status(409);
    next(new Error('Class is already full'));
    return;
  }

  const enrollment = {
    _id: newId('enroll'),
    class: item._id,
    user: req.user._id,
    enrolledAt: new Date().toISOString()
  };
  memory.enrollments.push(enrollment);
  res.status(201).json(enrollment);
});

router.delete('/classes/:id/enroll', memoryProtect, (req, res, next) => {
  const index = memory.enrollments.findIndex((item) => item.class === req.params.id && item.user === req.user._id);
  if (index === -1) {
    res.status(404);
    next(new Error('Enrollment not found'));
    return;
  }

  memory.enrollments.splice(index, 1);
  res.json({ message: 'Enrollment cancelled' });
});

router.get('/classes/:id/students', memoryProtect, memoryAdminOnly, (req, res, next) => {
  const item = memory.classes.find((classItem) => classItem._id === req.params.id);
  if (!item) {
    res.status(404);
    next(new Error('Class not found'));
    return;
  }

  res.json(memory.enrollments
    .filter((enrollment) => enrollment.class === item._id)
    .map((enrollment) => ({
      id: enrollment._id,
      enrolledAt: enrollment.enrolledAt,
      user: publicUser(memory.users.find((user) => user._id === enrollment.user))
    }))
    .filter((enrollment) => enrollment.user));
});

export default router;
