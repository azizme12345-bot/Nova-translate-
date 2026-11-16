import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const limiters = new Map<number, Ratelimit>();
let warnedMissingRedisEnv = false;

function getUpstashLimiter(maxRequestsPerMinute: number): Ratelimit | null {
  const url = (process.env.UPSTASH_REDIS_REST_URL || '').trim();
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN || '').trim();

  if (!url || !token) {
    if (!warnedMissingRedisEnv) {
      warnedMissingRedisEnv = true;
      console.warn(
        '[rate-limit] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is missing. Skipping rate limit.'
      );
    }
    return null;
  }

  let limiter = limiters.get(maxRequestsPerMinute);
  if (!limiter) {
    try {
      const redis = new Redis({ url, token });
      limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(maxRequestsPerMinute, '1 m'),
        analytics: false,
        prefix: 'lafz:ratelimit',
      });
      limiters.set(maxRequestsPerMinute, limiter);
    } catch (err) {
      console.warn('[rate-limit] Failed to initialize Upstash Redis client. Skipping rate limit.', err);
      return null;
    }
  }
  return limiter;
}

function getHostOnly(val: string | string[] | undefined): string {
  const first = (Array.isArray(val) ? val[0] : val || '').split(',')[0].trim();
  return first.toLowerCase();
}

function parseUrlHost(raw: string | string[] | undefined): string {
  const val = Array.isArray(raw) ? raw[0] : raw;
  if (!val) return '';
  try {
    return new URL(val).host.toLowerCase();
  } catch {
    return '';
  }
}

function getClientIp(req: any): string {
  const forwarded = req.headers?.['x-forwarded-for'];
  const realIp = req.headers?.['x-real-ip'];
  return (
    (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0].trim() ||
    (Array.isArray(realIp) ? realIp[0] : realIp)?.trim() ||
    req.socket?.remoteAddress ||
    'anonymous'
  );
}

export async function enforceSameOriginAndRateLimit(
  req: any,
  res: any,
  options: { maxRequestsPerMinute?: number } = {}
): Promise<boolean> {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Vary', 'Origin');

  const reqHost = getHostOnly(req.headers?.['x-forwarded-host'] || req.headers?.host);
  const originHeader = req.headers?.origin;
  const refererHeader = req.headers?.referer;
  const secFetchSite = String(req.headers?.['sec-fetch-site'] || '').toLowerCase();

  if (secFetchSite === 'cross-site') {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: { code: 'FORBIDDEN_ORIGIN', message: 'Cross-site requests are not allowed.' } }));
    return false;
  }

  if (originHeader) {
    const originHost = parseUrlHost(originHeader);
    if (!reqHost || !originHost || originHost !== reqHost) {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: { code: 'FORBIDDEN_ORIGIN', message: 'Cross-origin requests are not allowed.' } }));
      return false;
    }
    res.setHeader('Access-Control-Allow-Origin', Array.isArray(originHeader) ? originHeader[0] : originHeader);
  } else if (refererHeader) {
    const refHost = parseUrlHost(refererHeader);
    if (reqHost && refHost && refHost !== reqHost) {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: { code: 'FORBIDDEN_ORIGIN', message: 'Cross-origin requests are not allowed.' } }));
      return false;
    }
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return false;
  }

  if (options.maxRequestsPerMinute && options.maxRequestsPerMinute > 0) {
    const limiter = getUpstashLimiter(options.maxRequestsPerMinute);
    if (limiter) {
      try {
        const ip = getClientIp(req);
        const { success, limit, remaining, reset } = await limiter.limit(ip);
        const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));

        res.setHeader('X-RateLimit-Limit', String(limit));
        res.setHeader('X-RateLimit-Remaining', String(remaining));
        res.setHeader('X-RateLimit-Reset', String(retryAfter));

        if (!success) {
          res.statusCode = 429;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
                message: 'Too many requests. Please wait a minute and try again.',
                retryAfter,
              },
            })
          );
          return false;
        }
      } catch (err) {
        console.warn('[rate-limit] Upstash rate limit check failed. Skipping limit.', err);
      }
    }
  }

  return true;
}
