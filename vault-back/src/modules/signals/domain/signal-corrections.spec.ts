import { signalContext } from './signal-context.js';
import { mergeCorrections, validateCorrections } from './signal-corrections.js';
import type { Person } from './person.js';

const people: Person[] = [{ id: 'p1', alias: 'Compagne', variants: ['Marie'] }];

describe('validateCorrections', () => {
  it('should accept valid keys and ranges, including null', () => {
    // Act
    const problems = validateCorrections(
      { alcohol: 1, rumination: 4, person_p1_tone: 2, conflict: null },
      signalContext({ people }),
    );

    // Assert
    expect(problems).toEqual([]);
  });

  it('should reject unknown keys and keys of unknown people', () => {
    // Act
    const problems = validateCorrections(
      { nope: 1, person_zz_present: 1 },
      signalContext({ people }),
    );

    // Assert
    expect(problems).toHaveLength(2);
  });

  it('should reject out of range and non numeric values', () => {
    // Act
    const problems = validateCorrections(
      {
        alcohol: 2,
        rumination: 5,
        fatigue: -1,
        conflict: 'x' as unknown as number,
      },
      signalContext(),
    );

    // Assert
    expect(problems).toHaveLength(4);
  });
});

describe('mergeCorrections', () => {
  it('should set values and remove overrides on null', () => {
    // Act
    const merged = mergeCorrections(
      { alcohol: 1, conflict: 0 },
      { alcohol: null, fatigue: 3 },
    );

    // Assert
    expect(merged).toEqual({ conflict: 0, fatigue: 3 });
  });
});
