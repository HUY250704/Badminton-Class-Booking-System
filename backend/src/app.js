import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import authRoutes from './routes/authRoutes.js';
import classRoutes from './routes/classRoutes.js';
import memoryRoutes from './memory/routes.js';
import { errorHandler, notFound } from './middleware/error.js';

const app = express();

function getAllowedOrigins() {
  return (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

app.use(cors({
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
  credentials: true
}));
app.use(express.json());
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
}

app.use(notFound);
app.use(errorHandler);

export default app;
