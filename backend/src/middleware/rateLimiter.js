import { createClient } from 'redis';

const memoryHits = new Map();
let redisClientPromise = null;

async function getRedisClient() {
  if (!process.env.REDIS_URL) return null;
  if (!redisClientPromise) {
    const client = createClient({ url: process.env.REDIS_URL });
    client.on('error', (error) => {
      if (process.env.NODE_ENV !== 'test') {
        console.warn('Redis rate limiter error:', error.message);
      }
    });
    redisClientPromise = client.connect().then(() => client).catch((error) => {
      redisClientPromise = null;
      if (process.env.NODE_ENV !== 'test') {
        console.warn('Redis unavailable, using memory rate limiter:', error.message);
      }
      return null;
    });
  }
  return redisClientPromise;
}

function memoryCheck(key, windowMs, max) {
  const now = Date.now();
  const current = memoryHits.get(key);
  if (!current || current.resetAt <= now) {
    memoryHits.set(key, { count: 1, resetAt: now + windowMs });
    return { limited: false, remaining: max - 1, resetAt: now + windowMs };
  }

  current.count += 1;
  memoryHits.set(key, current);
  return {
    limited: current.count > max,
    remaining: Math.max(max - current.count, 0),
    resetAt: current.resetAt
  };
}

export function rateLimiter({ windowMs = 15 * 60 * 1000, max = 300 } = {}) {
  return async (req, res, next) => {
    const key = `rate:${req.ip}:${req.path}`;
    const redis = await getRedisClient();
    let result;

    if (redis) {
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.pExpire(key, windowMs);
      }
      const ttl = await redis.pTTL(key);
      result = {
        limited: count > max,
        remaining: Math.max(max - count, 0),
        resetAt: Date.now() + Math.max(ttl, 0)
      };
    } else {
      result = memoryCheck(key, windowMs, max);
    }

    res.setHeader('RateLimit-Limit', max);
    res.setHeader('RateLimit-Remaining', result.remaining);
    res.setHeader('RateLimit-Reset', Math.ceil(result.resetAt / 1000));

    if (result.limited) {
      res.status(429).json({
        message: 'Too many requests. Please try again later.',
        code: 'RATE_LIMITED'
      });
      return;
    }

    next();
  };
}
