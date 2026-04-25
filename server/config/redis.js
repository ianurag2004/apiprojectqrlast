const Redis = require('ioredis');

let redisClient = null;

const connectRedis = () => {
  try {
    redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null; // Stop retrying
        return Math.min(times * 200, 2000);
      },
    });

    redisClient.on('connect', () => console.log('✅ Redis connected'));
    redisClient.on('error', (err) => {
      if (err.code !== 'ECONNREFUSED') {
        console.warn('⚠️  Redis warning:', err.message);
      }
    });

    redisClient.connect().catch(() => {
      console.warn('⚠️  Redis not available — running without cache');
      redisClient = null;
    });
  } catch {
    console.warn('⚠️  Redis init failed — running without cache');
    redisClient = null;
  }
};

const getRedis = () => redisClient;

// Helper: safe get/set/del that degrades gracefully
const cacheGet = async (key) => {
  if (!redisClient) return null;
  try { return await redisClient.get(key); } catch { return null; }
};

const cacheSet = async (key, value, ttlSeconds = 300) => {
  if (!redisClient) return;
  try { await redisClient.set(key, value, 'EX', ttlSeconds); } catch {}
};

const cacheDel = async (key) => {
  if (!redisClient) return;
  try { await redisClient.del(key); } catch {}
};

module.exports = { connectRedis, getRedis, cacheGet, cacheSet, cacheDel };
