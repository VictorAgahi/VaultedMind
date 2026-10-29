import { resolveClientIp } from './custom-throttler.guard.js';

describe('resolveClientIp', () => {
  const original = process.env.TRUSTED_CLIENT_IP_HEADER;
  afterEach(() => {
    process.env.TRUSTED_CLIENT_IP_HEADER = original;
  });

  it('uses req.ip when no trusted header is configured', () => {
    delete process.env.TRUSTED_CLIENT_IP_HEADER;
    expect(
      resolveClientIp({
        ip: '10.0.0.1',
        headers: { 'cf-connecting-ip': '1.2.3.4' },
      }),
    ).toBe('10.0.0.1');
  });

  it('uses the trusted header when configured', () => {
    process.env.TRUSTED_CLIENT_IP_HEADER = 'CF-Connecting-IP';
    expect(
      resolveClientIp({
        ip: '10.0.0.1',
        headers: { 'cf-connecting-ip': '1.2.3.4' },
      }),
    ).toBe('1.2.3.4');
  });

  it('falls back to req.ip when the trusted header is missing', () => {
    process.env.TRUSTED_CLIENT_IP_HEADER = 'cf-connecting-ip';
    expect(resolveClientIp({ ip: '10.0.0.1', headers: {} })).toBe('10.0.0.1');
  });
});
