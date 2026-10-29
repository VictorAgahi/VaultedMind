import type { Request, Response, NextFunction } from 'express';

export const ALLOWED_ORIGINS = [
  'https://vault-mind.cyrus-ag.com',
  'http://localhost:3000',
];

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * CSRF protection for cookie-authenticated requests.
 * The session cookie is scoped to .cyrus-ag.com, so any sibling subdomain is "same-site"
 * and SameSite=Lax does not stop it from sending simple POSTs (no CORS preflight).
 * Browsers always send Origin on cross-origin state-changing requests, so we reject
 * unknown origins. Requests without Origin (Apple Shortcuts, curl) carry no ambient cookie risk.
 */
export function originCheckMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.headers.origin;
  if (!origin || ALLOWED_ORIGINS.includes(origin)) return next();

  res.status(403).json({
    statusCode: 403,
    message: 'Origin not allowed',
    error: 'Forbidden',
  });
}
