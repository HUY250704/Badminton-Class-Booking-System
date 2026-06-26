import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectDB } from './config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');

dotenv.config({ path: envPath });
console.log('Environment loaded:', Boolean(process.env.NODE_ENV || process.env.PORT || process.env.MONGO_URI));
console.log('Mongo URI configured:', Boolean(process.env.MONGO_URI));

const port = process.env.PORT || 5000;

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is required');
  process.exit(1);
}

try {
  await connectDB();
} catch (error) {
  if (process.env.NODE_ENV === 'production') {
    console.error('MongoDB connection failed. Check database configuration and network access.');
    process.exit(1);
  }

  process.env.USE_MEMORY_DB = 'true';
  console.warn('MongoDB unavailable. Falling back to in-memory development data.');
}

const { default: app } = await import('./app.js');

app.listen(port, () => {
  console.log(`API running on port ${port}`);
  if (process.env.USE_MEMORY_DB === 'true') {
    console.log('Demo accounts: admin@example.com / password123, user@example.com / password123');
  }
});
