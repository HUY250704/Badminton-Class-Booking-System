import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import authRoutes from './routes/authRoutes.js';
import classRoutes from './routes/classRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import coachRoutes from './routes/coachRoutes.js';
import memoryRoutes from './memory/routes.js';
import { errorHandler, notFound } from './middleware/error.js';
import { rateLimiter } from './middleware/rateLimiter.js';

const app = express();

function getAllowedOrigins() {
  const configuredOrigins = process.env.CORS_ORIGINS || process.env.CLIENT_URL || 'http://localhost:5173';

  return configuredOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const corsOptions = {
  origin(origin, callback) {
    const allowedOrigins = getAllowedOrigins();
    const isLocalDevOrigin = process.env.NODE_ENV !== 'production'
      && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin || '');

    if (!origin || allowedOrigins.includes(origin) || isLocalDevOrigin) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use('/api', rateLimiter({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.RATE_LIMIT_MAX || 300)
}));
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'tiny' : 'dev'));
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', database: process.env.USE_MEMORY_DB === 'true' ? 'memory' : 'mongodb' });
});

if (process.env.USE_MEMORY_DB === 'true') {
  console.warn('Using in-memory development data because MongoDB is not connected.');
  app.use('/api', memoryRoutes);
} else {
  app.use('/api/auth', authRoutes);
  app.use('/api/classes', classRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/uploads', uploadRoutes);
  app.use('/api/coaches', coachRoutes);
}

app.use(notFound);
app.use(errorHandler);

export default app;
