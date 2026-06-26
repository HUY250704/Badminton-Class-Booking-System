import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError.js';

const classLevels = new Set(['beginner', 'intermediate', 'advanced']);

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeEmail(value) {
  return cleanString(value).toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function requireFields(fields) {
  const missing = Object.entries(fields)
    .filter(([, value]) => !value)
    .map(([field]) => field);

  if (missing.length) {
    throw new ApiError(400, 'Please provide all required fields', 'VALIDATION_ERROR', missing);
  }
}

export function validateRegister(req, res, next) {
  try {
    const name = cleanString(req.body.name);
    const email = normalizeEmail(req.body.email);
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    requireFields({ name, email, password });

    if (name.length < 2) {
      throw new ApiError(400, 'Name must be at least 2 characters', 'VALIDATION_ERROR', ['name']);
    }

    if (!isValidEmail(email)) {
      throw new ApiError(400, 'Please provide a valid email address', 'VALIDATION_ERROR', ['email']);
    }

    if (password.length < 6) {
      throw new ApiError(400, 'Password must be at least 6 characters', 'VALIDATION_ERROR', ['password']);
    }

    req.body = { name, email, password };
    next();
  } catch (error) {
    next(error);
  }
}

export function validateLogin(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    requireFields({ email, password });

    if (!isValidEmail(email)) {
      throw new ApiError(400, 'Please provide a valid email address', 'VALIDATION_ERROR', ['email']);
    }

    req.body = { email, password };
    next();
  } catch (error) {
    next(error);
  }
}

export function validateClassQuery(req, res, next) {
  try {
    const { page, limit, level } = req.query;

    if (level && !classLevels.has(level)) {
      throw new ApiError(400, 'Invalid class level', 'VALIDATION_ERROR', ['level']);
    }

    if (page !== undefined && (!Number.isInteger(Number(page)) || Number(page) < 1)) {
      throw new ApiError(400, 'Page must be a positive integer', 'VALIDATION_ERROR', ['page']);
    }

    if (limit !== undefined && (!Number.isInteger(Number(limit)) || Number(limit) < 1)) {
      throw new ApiError(400, 'Limit must be a positive integer', 'VALIDATION_ERROR', ['limit']);
    }

    if (typeof req.query.search === 'string') {
      req.query.search = req.query.search.trim();
    }

    next();
  } catch (error) {
    next(error);
  }
}

export function validateClassBody({ partial = false } = {}) {
  return (req, res, next) => {
    try {
      const payload = {};
      const textFields = ['title', 'description', 'coachName', 'schedule', 'location'];

      textFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          payload[field] = cleanString(req.body[field]);
        }
      });

      if (req.body.level !== undefined) {
        payload.level = cleanString(req.body.level);
      }

      if (req.body.startDate !== undefined) {
        payload.startDate = req.body.startDate;
      }

      if (req.body.maxStudents !== undefined) {
        payload.maxStudents = Number(req.body.maxStudents);
      }

      if (!partial) {
        requireFields({
          title: payload.title,
          description: payload.description,
          coachName: payload.coachName,
          level: payload.level,
          startDate: payload.startDate,
          schedule: payload.schedule,
          location: payload.location,
          maxStudents: payload.maxStudents
        });
      }

      const emptyTextFields = textFields.filter((field) => req.body[field] !== undefined && !payload[field]);
      if (emptyTextFields.length) {
        throw new ApiError(400, 'Text fields cannot be empty', 'VALIDATION_ERROR', emptyTextFields);
      }

      if (payload.level !== undefined && !classLevels.has(payload.level)) {
        throw new ApiError(400, 'Invalid class level', 'VALIDATION_ERROR', ['level']);
      }

      if (payload.startDate !== undefined) {
        const date = new Date(payload.startDate);
        if (Number.isNaN(date.getTime())) {
          throw new ApiError(400, 'Start date must be a valid date', 'VALIDATION_ERROR', ['startDate']);
        }
        if (date < startOfToday()) {
          throw new ApiError(400, 'Start date cannot be in the past', 'VALIDATION_ERROR', ['startDate']);
        }
        payload.startDate = date;
      }

      if (payload.maxStudents !== undefined && (!Number.isInteger(payload.maxStudents) || payload.maxStudents < 1)) {
        throw new ApiError(400, 'Max students must be a positive integer', 'VALIDATION_ERROR', ['maxStudents']);
      }

      req.body = payload;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function validateObjectId(paramName = 'id') {
  return (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params[paramName])) {
      next(new ApiError(400, 'Invalid class id', 'INVALID_OBJECT_ID', [paramName]));
      return;
    }

    next();
  };
}
