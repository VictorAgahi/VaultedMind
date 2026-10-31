import { describe, expect, it } from '@jest/globals';
import { resolveSyncDate } from './sync-date.js';

describe('resolveSyncDate', () => {
  const now = new Date('2026-10-31T22:30:00Z');

  it('should keep a valid day', () => {
    expect(resolveSyncDate('2026-10-30', 'Europe/Paris', now)).toBe(
      '2026-10-30',
    );
  });

  it('should read an ISO timestamp in the user time zone', () => {
    expect(resolveSyncDate('2026-10-31T23:30:00Z', 'Europe/Paris', now)).toBe(
      '2026-11-01',
    );
  });

  it.each([undefined, '', '31 oct. 2026', '31/10/2026', '2026-02-30'])(
    'should fall back to the current day for %p',
    (raw) => {
      // 22:30 UTC is 23:30 in Paris (UTC+1 after the DST change), still October 31
      expect(resolveSyncDate(raw, 'Europe/Paris', now)).toBe('2026-10-31');
    },
  );
});
