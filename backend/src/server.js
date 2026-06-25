import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectDB } from './config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');

dotenv.config({ path: envPath });
console.log('Loaded env from:', envPath);

const port = process.env.PORT || 5000;

try {
  await connectDB();
} catch (error) {
  if (process.env.NODE_ENV === 'production') {
    console.error(error);
    process.exit(1);
  }

  process.env.USE_MEMORY_DB = 'true';
  console.warn(`MongoDB unavailable (${error.message}). Falling back to in-memory dev data.`);
}

const { default: app } = await import('./app.js');

app.listen(port, () => {
  console.log(`API running on port ${port}`);
  if (process.env.USE_MEMORY_DB === 'true') {
    console.log('Demo accounts: admin@example.com / password123, user@example.com / password123');
  }
});
