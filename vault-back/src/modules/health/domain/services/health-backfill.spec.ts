import { canFillFromHealth } from './health-backfill.js';

describe('canFillFromHealth', () => {
  it('should fill an empty day', () => {
    expect(canFillFromHealth(null)).toBe(true);
  });

  it('should refresh a value the sync wrote itself', () => {
    expect(canFillFromHealth({ source: 'health' })).toBe(true);
  });

  it('should never overwrite a manual value or an accepted autofill proposal', () => {
    expect(canFillFromHealth({ source: null })).toBe(false);
    expect(canFillFromHealth({})).toBe(false);
    expect(canFillFromHealth({ source: 'agent' })).toBe(false);
  });
});
