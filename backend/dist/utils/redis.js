import { Redis } from 'ioredis';
import { logger } from './logger.js';
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const isUpstash = redisUrl.includes('upstash.io');
export const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: isUpstash ? {} : undefined,
    retryStrategy: (times) => {
        logger.warn(`Redis connection lost. Retrying... (Attempt ${times})`);
        return Math.min(times * 50, 2000);
    }
});
redis.on('connect', () => {
    logger.info('Connected to Redis');
});
redis.on('error', (err) => {
    logger.error('Redis connection error:', err);
});
