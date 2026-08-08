import NodeCache from 'node-cache';
// Standard cache with 60s TTL
export const cache = new NodeCache({ stdTTL: 60, checkperiod: 120 });
// Middleware to cache HTTP responses
export const cacheMiddleware = (durationSecs) => {
    return (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }
        // Role-based cache isolation
        const roleKey = req.user?.role ? `_${req.user.role}` : '';
        const key = `__express__${req.originalUrl || req.url}${roleKey}`;
        const cachedResponse = cache.get(key);
        if (cachedResponse) {
            res.setHeader('X-Cache', 'HIT');
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            return res.send(cachedResponse);
        }
        res.setHeader('X-Cache', 'MISS');
        // Response interceptor
        const originalSend = res.send.bind(res);
        res.send = (body) => {
            // Only cache successful responses
            if (res.statusCode >= 200 && res.statusCode < 300) {
                cache.set(key, body, durationSecs);
            }
            return originalSend(body);
        };
        next();
    };
};
