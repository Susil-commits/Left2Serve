import { redis } from './redis.js';
// Cache compatibility layer for manual gets/sets used across the app
export const cache = {
    get: async (key) => {
        const val = await redis.get(key);
        if (!val)
            return undefined;
        try {
            return JSON.parse(val);
        }
        catch {
            return val;
        }
    },
    set: async (key, val, ttl = 60) => {
        const stringVal = typeof val === 'string' ? val : JSON.stringify(val);
        await redis.setex(key, ttl, stringVal);
    },
    del: async (key) => {
        await redis.del(key);
    }
};
export const cacheMiddleware = (durationSecs) => {
    return async (req, res, next) => {
        if (req.method !== 'GET') {
            return next();
        }
        // Role-based cache isolation
        const roleKey = req.user?.role ? `_${req.user.role}` : '';
        const key = `__express__${req.originalUrl || req.url}${roleKey}`;
        try {
            const cachedResponse = await redis.get(key);
            if (cachedResponse) {
                res.setHeader('X-Cache', 'HIT');
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                return res.send(cachedResponse);
            }
        }
        catch (err) {
            // Ignore cache read errors and proceed to DB
        }
        res.setHeader('X-Cache', 'MISS');
        const originalSend = res.send.bind(res);
        res.send = (body) => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const stringBody = typeof body === 'object' ? JSON.stringify(body) : body;
                redis.setex(key, durationSecs, stringBody).catch(() => { });
            }
            return originalSend(body);
        };
        next();
    };
};
