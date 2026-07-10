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
  const waitlistCount = memory.waitlist.filter((entry) => entry.class === item._id && entry.status === 'waiting').length;
  const coach = memory.coaches.find((coachItem) => coachItem._id === item.coach);
  return {
    ...item,
    coach: coach || item.coach || null,
    currentStudents,
    waitlistCount,
    isEnrolled: Boolean(userId && memory.enrollments.some((enrollment) => enrollment.class === item._id && enrollment.user === userId && enrollment.status !== 'cancelled')),
    isBookmarked: Boolean(userId && memory.bookmarks.some((bookmark) => bookmark.class === item._id && bookmark.user === userId)),
    userWaitlisted: Boolean(userId && memory.waitlist.some((entry) => entry.class === item._id && entry.user === userId && entry.status === 'waiting'))
  };
}

function classPrice(item) {
  return Number(item.price || process.env.DEFAULT_CLASS_PRICE || 500000);
}

function paymentPayload(item) {
  const klass = memory.classes.find((classItem) => classItem._id === item.class);
  return {
    ...item,
    class: klass || null,
    invoice: null
  };
}

function enrollUserInMemoryClass(classId, userId) {
  const existing = memory.enrollments.find((item) => item.class === classId && item.user === userId);
  if (existing) {
    existing.status = 'active';
    existing.cancelledAt = null;
    return existing;
  }

  const enrollment = {
    _id: newId('enroll'),
    class: classId,
    user: userId,
    enrolledAt: new Date().toISOString(),
    status: 'active',
    cancelledAt: null
  };
  memory.enrollments.push(enrollment);
  return enrollment;
}

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
    title: String(body.title || '').trim(),
    phone: String(body.phone || '').trim(),
    birthday: String(body.birthday || '').trim(),
    gender: String(body.gender || '').trim(),
    bio: String(body.bio || '').trim(),
    photoUrl: String(body.photoUrl || '').trim(),
    specialties,
    certificates: Array.isArray(body.certificates)
      ? body.certificates
      : String(body.certificates || '')
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean),
    yearsExperience: Math.max(Number(body.yearsExperience || 0), 0)
  };
}

function coachPayload(coach) {
  const relatedClasses = memory.classes.filter((item) => item.coach === coach._id);
  const upcomingClasses = relatedClasses
    .filter((item) => new Date(item.startDate) >= new Date())
    .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
    .slice(0, 5);

  return {
    ...coach,
    teachingSchedule: upcomingClasses,
    classCount: relatedClasses.length,
    totalStudents: relatedClasses.reduce((sum, item) => sum + Number(item.maxStudents || 0), 0)
  };
}

function reportRange(query) {
  const now = new Date();
  const start = query.startDate ? new Date(query.startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
  const end = query.endDate ? new Date(query.endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function inRange(value, start, end) {
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date >= start && date <= end;
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

router.get('/admin/metrics', memoryProtect, memoryAdminOnly, (req, res) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const activeEnrollments = memory.enrollments.filter((item) => item.status !== 'cancelled');
  const totalCapacity = memory.classes.reduce((sum, item) => sum + Number(item.maxStudents || 0), 0);
  const paidTransactions = (memory.payments || []).filter((item) => item.status === 'paid' && new Date(item.paidAt) >= monthStart && new Date(item.paidAt) < nextMonth);

  res.json({
    monthRevenue: paidTransactions.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    paidTransactions: paidTransactions.length,
    newStudents: memory.users.filter((item) => item.role === 'user' && inRange(item.createdAt || new Date(), monthStart, nextMonth)).length,
    upcomingClasses: memory.classes.filter((item) => new Date(item.startDate) >= now).slice(0, 5),
    fillRate: totalCapacity > 0 ? Math.round((activeEnrollments.length / totalCapacity) * 100) : null
  });
});

router.get('/admin/reports', memoryProtect, memoryAdminOnly, (req, res) => {
  const { start, end } = reportRange(req.query);
  const payments = (memory.payments || []).filter((item) => item.status === 'paid' && inRange(item.paidAt || item.createdAt, start, end));
  const enrollments = memory.enrollments.filter((item) => inRange(item.createdAt || item.enrolledAt, start, end));
  const cancelled = memory.enrollments.filter((item) => item.status === 'cancelled' && inRange(item.cancelledAt, start, end));
  const classes = memory.classes.filter((item) => inRange(item.startDate, start, end));
  const revenueByDay = new Map();
  const enrollmentByDay = new Map();

  payments.forEach((item) => {
    const key = new Date(item.paidAt || item.createdAt).toISOString().slice(0, 10);
    const current = revenueByDay.get(key) || { date: key, revenue: 0, transactions: 0 };
    current.revenue += Number(item.amount || 0);
    current.transactions += 1;
    revenueByDay.set(key, current);
  });

  enrollments.forEach((item) => {
    const key = new Date(item.createdAt || item.enrolledAt).toISOString().slice(0, 10);
    enrollmentByDay.set(key, { date: key, enrollments: (enrollmentByDay.get(key)?.enrollments || 0) + 1 });
  });

  res.json({
    range: { startDate: start.toISOString(), endDate: end.toISOString() },
    summary: {
      revenueTotal: payments.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      paidTransactions: payments.length,
      newEnrollments: enrollments.length,
      cancelledEnrollments: cancelled.length,
      activeStudents: new Set(memory.enrollments.filter((item) => item.status !== 'cancelled').map((item) => item.user)).size,
      classesStarted: classes.length,
      attendanceMarked: 0,
      presentRate: null
    },
    revenueByDay: [...revenueByDay.values()].sort((a, b) => a.date.localeCompare(b.date)),
    enrollmentByDay: [...enrollmentByDay.values()].sort((a, b) => a.date.localeCompare(b.date)),
    classBreakdown: classes.map((item) => {
      const activeEnrollments = memory.enrollments.filter((enrollment) => enrollment.class === item._id && enrollment.status !== 'cancelled').length;
      const classPayments = payments.filter((payment) => payment.class === item._id);
      return {
        _id: item._id,
        title: item.title,
        coachName: item.coachName,
        level: item.level,
        startDate: item.startDate,
        maxStudents: item.maxStudents,
        activeEnrollments,
        fillRate: item.maxStudents > 0 ? Math.round((activeEnrollments / item.maxStudents) * 100) : null,
        revenue: classPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
        paidTransactions: classPayments.length,
        presentRate: null
      };
    })
  });
});

router.get('/admin/audit-logs', memoryProtect, memoryAdminOnly, (req, res) => {
  res.json([]);
});

router.get('/admin/transfers', memoryProtect, memoryAdminOnly, (req, res) => {
  res.json([]);
});

router.get('/coaches', (req, res) => {
  const search = String(req.query.search || '').trim().toLowerCase();
  const coaches = memory.coaches
    .filter((item) => {
      if (!search) return true;
      return [item.name, item.email, item.bio].some((value) => String(value || '').toLowerCase().includes(search));
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  res.json(coaches.map(coachPayload));
});

router.get('/coaches/:id', (req, res, next) => {
  const coach = memory.coaches.find((item) => item._id === req.params.id);
  if (!coach) {
    next(new ApiError(404, 'Coach not found', 'COACH_NOT_FOUND'));
    return;
  }

  res.json(coachPayload(coach));
});

router.post('/coaches', memoryProtect, memoryAdminOnly, (req, res, next) => {
  const payload = normalizeCoachPayload(req.body);
  if (!payload.name) {
    next(new ApiError(400, 'Coach name is required', 'VALIDATION_ERROR', ['name']));
    return;
  }

  const coach = {
    _id: newId('coach'),
    ...payload,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  memory.coaches.push(coach);
  res.status(201).json(coach);
});

router.patch('/coaches/:id', memoryProtect, memoryAdminOnly, (req, res, next) => {
  const coach = memory.coaches.find((item) => item._id === req.params.id);
  if (!coach) {
    next(new ApiError(404, 'Coach not found', 'COACH_NOT_FOUND'));
    return;
  }

  const payload = normalizeCoachPayload(req.body);
  if (!payload.name) {
    next(new ApiError(400, 'Coach name is required', 'VALIDATION_ERROR', ['name']));
    return;
  }

  Object.assign(coach, payload, { updatedAt: new Date().toISOString() });
  res.json(coach);
});

router.get('/classes', validateClassQuery, memoryOptionalAuth, (req, res) => {
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
  const term = search.trim().toLowerCase();
  const coachTerm = String(coach).trim().toLowerCase();
  const locationTerm = String(location).trim().toLowerCase();
  const coachLocationTerm = String(coachLocation).trim().toLowerCase();
  const from = startDateFrom ? new Date(startDateFrom) : null;
  const to = startDateTo ? new Date(startDateTo) : null;
  if (to && !Number.isNaN(to.getTime())) to.setHours(23, 59, 59, 999);
  const direction = sortOrder === 'desc' ? -1 : 1;

  let classes = memory.classes
    .filter((item) => includePast || new Date(item.startDate) >= new Date())
    .filter((item) => !level || item.level === level)
    .filter((item) => minPrice === undefined || Number(item.price || 0) >= Number(minPrice))
    .filter((item) => maxPrice === undefined || Number(item.price || 0) <= Number(maxPrice))
    .filter((item) => !from || Number.isNaN(from.getTime()) || new Date(item.startDate) >= from)
    .filter((item) => !to || Number.isNaN(to.getTime()) || new Date(item.startDate) <= to)
    .filter((item) => !coachTerm || String(item.coachName || '').toLowerCase().includes(coachTerm))
    .filter((item) => !locationTerm || String(item.location || '').toLowerCase().includes(locationTerm))
    .filter((item) => {
      if (!coachLocationTerm) return true;
      return [item.coachName, item.location].some((value) => String(value || '').toLowerCase().includes(coachLocationTerm));
    })
    .filter((item) => {
      if (!term) return true;
      return [item.title, item.coachName, item.description, item.location].some((value) => String(value || '').toLowerCase().includes(term));
    })
    .sort((a, b) => {
      if (sortBy === 'price') return (Number(a.price || 0) - Number(b.price || 0)) * direction;
      if (sortBy === 'popularity') {
        const aCount = memory.enrollments.filter((item) => item.class === a._id && item.status !== 'cancelled').length;
        const bCount = memory.enrollments.filter((item) => item.class === b._id && item.status !== 'cancelled').length;
        return (bCount - aCount) * direction;
      }
      return (new Date(a.startDate) - new Date(b.startDate)) * direction;
    });

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
  const overlap = memory.classes.find((item) => item.location.toLowerCase() === req.body.location.toLowerCase() && new Date(item.startDate).getTime() === new Date(req.body.startDate).getTime());
  if (overlap) {
    res.status(409).json({ message: 'Another class already uses this location at the same time.', code: 'CLASS_SCHEDULE_CONFLICT', fields: ['startDate', 'location'] });
    return;
  }

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
    price: Number(req.body.price ?? process.env.DEFAULT_CLASS_PRICE ?? 500000),
    imageUrl: req.body.imageUrl || '',
    coach: req.body.coach || null,
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

router.get('/classes/my/bookmarks', memoryProtect, (req, res) => {
  const classes = memory.bookmarks
    .filter((item) => item.user === req.user._id)
    .map((item) => memory.classes.find((classItem) => classItem._id === item.class))
    .filter(Boolean)
    .map((item) => classPayload(item, req.user._id));

  res.json(classes);
});

router.get('/classes/my/waitlist', memoryProtect, (req, res) => {
  const waiting = memory.waitlist
    .filter((item) => item.user === req.user._id && item.status === 'waiting')
    .sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt));

  res.json(waiting.map((item) => {
    const klass = memory.classes.find((classItem) => classItem._id === item.class);
    const position = memory.waitlist
      .filter((entry) => entry.class === item.class && entry.status === 'waiting' && new Date(entry.joinedAt) <= new Date(item.joinedAt))
      .length;

    return {
      _id: item._id,
      joinedAt: item.joinedAt,
      position,
      class: klass ? classPayload(klass, req.user._id) : null
    };
  }).filter((item) => item.class));
});

router.get('/payments/my', memoryProtect, (req, res) => {
  const payments = (memory.payments || [])
    .filter((item) => item.user === req.user._id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map(paymentPayload);

  res.json(payments);
});

router.post('/payments/:transactionId/simulate-success', memoryProtect, (req, res, next) => {
  const transaction = (memory.payments || []).find((item) => item._id === req.params.transactionId && item.user === req.user._id);
  if (!transaction) {
    next(new ApiError(404, 'Transaction not found', 'TRANSACTION_NOT_FOUND'));
    return;
  }

  const klass = memory.classes.find((item) => item._id === transaction.class);
  if (!klass) {
    next(new ApiError(404, 'Class not found', 'CLASS_NOT_FOUND'));
    return;
  }

  const currentStudents = memory.enrollments.filter((item) => item.class === klass._id && item.status !== 'cancelled').length;
  const alreadyActive = memory.enrollments.some((item) => item.class === klass._id && item.user === req.user._id && item.status !== 'cancelled');
  if (!alreadyActive && currentStudents >= klass.maxStudents) {
    next(new ApiError(409, 'Class became full before payment was completed.', 'CLASS_FULL'));
    return;
  }

  const enrollment = enrollUserInMemoryClass(klass._id, req.user._id);
  transaction.status = 'paid';
  transaction.enrollment = enrollment._id;
  transaction.paidAt = transaction.paidAt || new Date().toISOString();

  res.json(paymentPayload(transaction));
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

  const nextStartDate = req.body.startDate !== undefined ? new Date(req.body.startDate) : new Date(item.startDate);
  const nextLocation = req.body.location !== undefined ? req.body.location : item.location;
  const overlap = memory.classes.find((classItem) => classItem._id !== item._id && classItem.location.toLowerCase() === nextLocation.toLowerCase() && new Date(classItem.startDate).getTime() === nextStartDate.getTime());
  if (overlap) {
    next(new ApiError(409, 'Another class already uses this location at the same time.', 'CLASS_SCHEDULE_CONFLICT', ['startDate', 'location']));
    return;
  }

  ['title', 'description', 'coachName', 'level', 'schedule', 'location', 'imageUrl', 'coach'].forEach((field) => {
    if (req.body[field] !== undefined) item[field] = req.body[field];
  });
  if (req.body.startDate !== undefined) item.startDate = new Date(req.body.startDate).toISOString();
  if (req.body.maxStudents !== undefined) item.maxStudents = Number(req.body.maxStudents);
  if (req.body.price !== undefined) item.price = Number(req.body.price);
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

router.post('/classes/:id/payments', memoryProtect, (req, res, next) => {
  const item = memory.classes.find((classItem) => classItem._id === req.params.id);
  if (!item) {
    next(new ApiError(404, 'Class not found', 'CLASS_NOT_FOUND'));
    return;
  }

  const currentStudents = memory.enrollments.filter((enrollment) => enrollment.class === item._id && enrollment.status !== 'cancelled').length;
  if (currentStudents >= item.maxStudents) {
    next(new ApiError(409, 'Class is full. Join the waitlist instead.', 'CLASS_FULL'));
    return;
  }

  const existingEnrollment = memory.enrollments.find((enrollment) => enrollment.class === item._id && enrollment.user === req.user._id && enrollment.status !== 'cancelled');
  if (existingEnrollment) {
    next(new ApiError(409, 'You are already enrolled in this class', 'ALREADY_ENROLLED'));
    return;
  }

  const transaction = {
    _id: newId('pay'),
    user: req.user._id,
    class: item._id,
    enrollment: null,
    amount: classPrice(item),
    currency: String(process.env.STRIPE_CURRENCY || 'vnd').toUpperCase(),
    provider: 'stripe',
    providerRef: `MEMORY-${item._id}-${Date.now()}`,
    checkoutUrl: '',
    status: 'pending',
    paidAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  memory.payments.push(transaction);

  res.status(201).json({
    transaction,
    checkoutUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}/payments?pending=${transaction._id}`,
    sandboxReady: false,
    provider: transaction.provider
  });
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

router.post('/classes/:id/waitlist', memoryProtect, (req, res, next) => {
  const klass = memory.classes.find((item) => item._id === req.params.id);
  if (!klass) {
    next(new ApiError(404, 'Class not found', 'CLASS_NOT_FOUND'));
    return;
  }

  const existingEnrollment = memory.enrollments.find((item) => item.class === req.params.id && item.user === req.user._id && item.status !== 'cancelled');
  if (existingEnrollment) {
    next(new ApiError(409, 'You are already enrolled in this class', 'ALREADY_ENROLLED'));
    return;
  }

  let entry = memory.waitlist.find((item) => item.class === req.params.id && item.user === req.user._id);
  if (entry) {
    entry.status = 'waiting';
    entry.joinedAt = new Date().toISOString();
  } else {
    entry = {
      _id: newId('wait'),
      class: req.params.id,
      user: req.user._id,
      status: 'waiting',
      joinedAt: new Date().toISOString(),
      promotedAt: null
    };
    memory.waitlist.push(entry);
  }

  const position = memory.waitlist
    .filter((item) => item.class === req.params.id && item.status === 'waiting' && new Date(item.joinedAt) <= new Date(entry.joinedAt))
    .length;

  res.status(201).json({ ...entry, position });
});

router.delete('/classes/:id/waitlist', memoryProtect, (req, res) => {
  const entry = memory.waitlist.find((item) => item.class === req.params.id && item.user === req.user._id && item.status === 'waiting');
  if (entry) entry.status = 'cancelled';
  res.json({ message: 'Left waitlist' });
});

router.get('/classes/:id/waitlist', memoryProtect, memoryAdminOnly, (req, res) => {
  const waiting = memory.waitlist
    .filter((item) => item.class === req.params.id && item.status === 'waiting')
    .sort((a, b) => new Date(a.joinedAt) - new Date(b.joinedAt));

  res.json(waiting.map((item, index) => ({
    ...item,
    position: index + 1,
    user: publicUser(memory.users.find((user) => user._id === item.user))
  })).filter((item) => item.user));
});

router.post('/classes/:id/bookmark', memoryProtect, (req, res, next) => {
  const klass = memory.classes.find((item) => item._id === req.params.id);
  if (!klass) {
    next(new ApiError(404, 'Class not found', 'CLASS_NOT_FOUND'));
    return;
  }

  const index = memory.bookmarks.findIndex((item) => item.class === req.params.id && item.user === req.user._id);
  if (index >= 0) {
    memory.bookmarks.splice(index, 1);
    res.json({ bookmarked: false });
    return;
  }

  memory.bookmarks.push({ _id: newId('bookmark'), class: req.params.id, user: req.user._id, createdAt: new Date().toISOString() });
  res.status(201).json({ bookmarked: true });
});

router.get('/classes/:id/attendance', memoryProtect, memoryAdminOnly, (req, res, next) => {
  const klass = memory.classes.find((item) => item._id === req.params.id);
  if (!klass) {
    next(new ApiError(404, 'Class not found', 'CLASS_NOT_FOUND'));
    return;
  }

  const students = memory.enrollments
    .filter((enrollment) => enrollment.class === klass._id && enrollment.status !== 'cancelled')
    .map((enrollment) => ({
      id: enrollment._id,
      enrolledAt: enrollment.enrolledAt,
      user: publicUser(memory.users.find((user) => user._id === enrollment.user))
    }))
    .filter((enrollment) => enrollment.user);

  res.json({
    students,
    attendance: memory.attendance.filter((item) => item.class === req.params.id)
  });
});

router.put('/classes/:id/attendance', memoryProtect, memoryAdminOnly, (req, res) => {
  const date = req.body.date ? new Date(req.body.date).toISOString() : new Date().toISOString();
  const records = Array.isArray(req.body.records) ? req.body.records : [];

  const saved = records.map((record) => {
    const existing = memory.attendance.find((item) => item.class === req.params.id && item.user === record.user && new Date(item.date).toDateString() === new Date(date).toDateString());
    if (existing) {
      existing.status = record.status;
      existing.date = date;
      return existing;
    }

    const item = {
      _id: newId('attendance'),
      class: req.params.id,
      user: record.user,
      date,
      status: record.status,
      markedBy: req.user._id,
      createdAt: new Date().toISOString()
    };
    memory.attendance.push(item);
    return item;
  });

  res.json(saved);
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
