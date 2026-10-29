import type { Request, Response } from 'express';
import { originCheckMiddleware } from './origin-check.middleware.js';

const run = (method: string, origin?: string) => {
  const req = { method, headers: origin ? { origin } : {} } as Request;
  const res = {
    statusCode: 200,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json() {
      return this;
    },
  } as unknown as Response & { statusCode: number };
  let nextCalled = false;
  originCheckMiddleware(req, res, () => {
    nextCalled = true;
  });
  return { nextCalled, status: res.statusCode };
};

describe('originCheckMiddleware', () => {
  it('allows safe methods from any origin', () => {
    expect(run('GET', 'https://evil.example').nextCalled).toBe(true);
  });

  it('allows state-changing requests from the app origin', () => {
    expect(run('POST', 'https://vault-mind.cyrus-ag.com').nextCalled).toBe(
      true,
    );
  });

  it('allows requests without Origin (non-browser clients)', () => {
    expect(run('POST').nextCalled).toBe(true);
  });

  it.each([
    'https://evil.example',
    'https://other.cyrus-ag.com',
    'https://vault-mind.cyrus-ag.com.evil.example',
    'null',
  ])('rejects POST from %s', (origin) => {
    const result = run('POST', origin);
    expect(result.nextCalled).toBe(false);
    expect(result.status).toBe(403);
  });
});
