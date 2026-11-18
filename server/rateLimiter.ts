import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const defaultIpRecords = new Map<string, RateLimitRecord>();
const allStores = new Set<Map<string, RateLimitRecord>>([defaultIpRecords]);

// Clean up stale IP records every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const store of allStores) {
      for (const [ip, record] of store.entries()) {
        if (now > record.resetTime) {
          store.delete(ip);
        }
      }
    }
  }, 5 * 60 * 1000);
}

export function checkRateLimit(
  req: any,
  options: { windowMs?: number; max?: number; store?: Map<string, RateLimitRecord> } = {}
): { allowed: boolean; retryAfter: number; limit: number; remaining: number } {
  const windowMs = options.windowMs || 60 * 1000; // 1 minute default
  const max = options.max || 60; // 60 requests per minute default
  const store = options.store || defaultIpRecords;
  const forwarded = req.headers?.['x-forwarded-for'];
  const ip =
    (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'anonymous';

  const now = Date.now();
  let record = store.get(ip);

  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + windowMs };
    store.set(ip, record);
  } else {
    record.count += 1;
  }

  const remaining = Math.max(0, max - record.count);
  const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

  return {
    allowed: record.count <= max,
    retryAfter: resetSeconds,
    limit: max,
    remaining,
  };
}

export function createRateLimiter(options: { windowMs?: number; max?: number } = {}) {
  const instanceStore = new Map<string, RateLimitRecord>();
  allStores.add(instanceStore);

  return (req: Request, res: Response, next: NextFunction) => {
    const { allowed, retryAfter, limit, remaining } = checkRateLimit(req, {
      ...options,
      store: instanceStore,
    });

    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', retryAfter);

    if (!allowed) {
      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please slow down and try again shortly.',
          retryAfter,
        },
      });
      return;
    }

    next();
  };
}
