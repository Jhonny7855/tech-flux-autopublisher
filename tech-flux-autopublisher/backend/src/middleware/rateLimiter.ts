import { MiddlewareHandler } from 'hono';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const store = new Map<string, { count: number; resetTime: number }>();

export function rateLimiter(config: RateLimitConfig): MiddlewareHandler {
  return async (c, next) => {
    const ip = c.req.header('CF-Connecting-IP') ||
               c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ||
               'unknown';

    const key = `${ip}:${c.req.path}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Clean old entries
    if (store.size > 10000) {
      for (const [k, v] of store.entries()) {
        if (v.resetTime < now) {
          store.delete(k);
        }
      }
    }

    const record = store.get(key);
    if (!record || record.resetTime < now) {
      store.set(key, { count: 1, resetTime: now + config.windowMs });
    } else if (record.count >= config.maxRequests) {
      return c.json(
        { error: 'Too Many Requests', message: 'Rate limit exceeded. Please try again later.' },
        429,
        { 'Retry-After': Math.ceil((record.resetTime - now) / 1000).toString() }
      );
    } else {
      record.count++;
    }

    // Add rate limit headers
    c.header('X-RateLimit-Limit', config.maxRequests.toString());
    c.header('X-RateLimit-Remaining', Math.max(0, config.maxRequests - (record?.count || 0)).toString());
    c.header('X-RateLimit-Reset', Math.ceil((record?.resetTime || now) / 1000).toString());

    await next();
  };
}