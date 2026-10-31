import { Logger } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

const logger = new Logger('HTTP');

/**
 * Logs one line per request once the response is sent, including requests rejected by guards.
 * Never logs bodies or query strings: they carry journal notes, health values and tokens
 * that are only ever stored encrypted.
 */
export function accessLogMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const startedAt = Date.now();
  res.on('finish', () => {
    const path = req.originalUrl.split('?')[0];
    const line = `${req.method} ${path} ${res.statusCode} - ${Date.now() - startedAt}ms | UA: ${req.get('user-agent') ?? ''}`;
    if (res.statusCode >= 500) logger.error(line);
    else if (res.statusCode >= 400) logger.warn(line);
    else logger.log(line);
  });
  next();
}
