import { isCleanNotesFresh } from './clean-notes-freshness.js';

describe('isCleanNotesFresh', () => {
  const hashOf = (text: string): string => `hash:${text}`;

  it('should be fresh when the source matches the current raw notes', () => {
    // Arrange
    const rawNotes = 'journee compliquee euh fatiguee';

    // Act
    const fresh = isCleanNotesFresh(rawNotes, hashOf(rawNotes), hashOf);

    // Assert
    expect(fresh).toBe(true);
  });

  it('should be stale once the raw notes were edited', () => {
    // Arrange
    const originalSource = hashOf('journee compliquee');

    // Act
    const fresh = isCleanNotesFresh(
      'journee compliquee et longue',
      originalSource,
      hashOf,
    );

    // Assert
    expect(fresh).toBe(false);
  });

  it.each([
    [null, 'hash:x'],
    [undefined, 'hash:x'],
    ['   ', 'hash:   '],
    ['notes', null],
    ['notes', undefined],
    ['notes', ''],
  ])(
    'should be stale when notes or source are missing (%p, %p)',
    (rawNotes, cleanSource) => {
      // Arrange
      // Act
      const fresh = isCleanNotesFresh(rawNotes, cleanSource, hashOf);

      // Assert
      expect(fresh).toBe(false);
    },
  );
});
