import { ApiError } from '../utils/ApiError.js';

export function notFound(req, res, next) {
  next(new ApiError(404, `Not found - ${req.originalUrl}`, 'NOT_FOUND'));
}

export function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || err.status || (res.statusCode === 200 ? 500 : res.statusCode);
  let message = err.message || 'Server error';
  let code = err.code || 'SERVER_ERROR';
  let fields = err.fields;

  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid resource id';
    code = 'INVALID_OBJECT_ID';
    fields = [err.path].filter(Boolean);
  }

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    code = 'VALIDATION_ERROR';
    fields = Object.keys(err.errors || {});
  }

  if (err.code === 11000) {
    statusCode = 409;
    message = 'Duplicate value';
    code = 'DUPLICATE_VALUE';
    fields = Object.keys(err.keyPattern || err.keyValue || {});
  }

  res.status(statusCode).json({
    message,
    code,
    fields,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
}
