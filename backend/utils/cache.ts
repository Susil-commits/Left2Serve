import NodeCache from 'node-cache';
import { Request, Response, NextFunction } from 'express';

// Standard cache with 60s TTL
export const cache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

// Middleware to cache HTTP responses
export const cacheMiddleware = (durationSecs: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = `__express__${req.originalUrl || req.url}`;
    const cachedResponse = cache.get(key);

    if (cachedResponse) {
      res.setHeader('X-Cache', 'HIT');
      return res.send(cachedResponse);
    }

    res.setHeader('X-Cache', 'MISS');
    
    // Override res.json and res.send to intercept the response
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
