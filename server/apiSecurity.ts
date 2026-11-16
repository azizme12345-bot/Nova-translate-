interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const ipBucket = new Map<string, RateLimitEntry>();

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

export function enforceSameOriginAndRateLimit(
  req: any,
  res: any,
  options: { maxRequestsPerMinute?: number } = {}
): boolean {
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
    const forwarded = req.headers?.['x-forwarded-for'];
    const ip =
      (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0].trim() ||
      req.socket?.remoteAddress ||
      'anonymous';

    const now = Date.now();
    const windowMs = 60 * 1000;
    let entry = ipBucket.get(ip);
    if (!entry || now > entry.resetTime) {
      entry = { count: 1, resetTime: now + windowMs };
      ipBucket.set(ip, entry);
    } else {
      entry.count += 1;
    }

    const remaining = Math.max(0, options.maxRequestsPerMinute - entry.count);
    const retryAfter = Math.max(1, Math.ceil((entry.resetTime - now) / 1000));
    res.setHeader('X-RateLimit-Limit', String(options.maxRequestsPerMinute));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(retryAfter));

    if (entry.count > options.maxRequestsPerMinute) {
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
  }

  return true;
}
