import { Redis } from 'ioredis';
import 'dotenv/config';
const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
    console.error('REDIS_URL not found in .env');
    process.exit(1);
}
const isUpstash = redisUrl.includes('upstash.io');
console.log('Connecting to:', redisUrl.replace(/:[^:@]+@/, ':***@'));
const redis = new Redis(redisUrl, {
    tls: isUpstash ? {} : undefined,
});
redis.on('connect', () => {
    console.log('✅ Successfully connected to Upstash Redis!');
    redis.quit();
});
redis.on('error', (err) => {
    console.error('❌ Redis connection error:', err);
    process.exit(1);
});
