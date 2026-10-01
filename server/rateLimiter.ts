import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const ipRecords = new Map<string, RateLimitRecord>();

// Clean up stale IP records every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipRecords.entries()) {
    if (now > record.resetTime) {
      ipRecords.delete(ip);
    }
  }
}, 5 * 60 * 1000);

export function createRateLimiter(options: { windowMs?: number; max?: number }) {
  const windowMs = options.windowMs || 60 * 1000; // 1 minute default
  const max = options.max || 60; // 60 requests per minute default

  return (req: Request, res: Response, next: NextFunction) => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0].trim() ||
      req.socket.remoteAddress ||
      'anonymous';

    const now = Date.now();
    let record = ipRecords.get(ip);

    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      ipRecords.set(ip, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, max - record.count);
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetSeconds);

    if (record.count > max) {
      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please slow down and try again shortly.',
          retryAfter: resetSeconds,
        },
      });
      return;
    }

    next();
  };
}
