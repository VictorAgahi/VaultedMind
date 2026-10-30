import { pseudonymize } from './pseudonymize.js';
import type { Person } from './person.js';

const partner: Person = {
  id: 'p1',
  alias: 'Compagne',
  variants: ['Marie', 'Mari'],
};
const boss: Person = {
  id: 'p2',
  alias: 'Chef',
  variants: ['Jean-Pierre', 'Jean'],
};

describe('pseudonymize', () => {
  it('should replace a name with its alias in brackets', () => {
    // Arrange
    const text = 'Dîner avec Marie ce soir.';

    // Act
    const result = pseudonymize(text, [partner]);

    // Assert
    expect(result).toBe('Dîner avec [Compagne] ce soir.');
  });

  it('should ignore case and accents', () => {
    // Arrange
    const person: Person = { id: 'p', alias: 'Mere', variants: ['Hélène'] };

    // Act
    const result = pseudonymize(
      'helene a appelé, HELENE aussi, Hélène encore',
      [person],
    );

    // Assert
    expect(result).toBe('[Mere] a appelé, [Mere] aussi, [Mere] encore');
  });

  it('should match a variant written without accents against an accented text', () => {
    // Arrange
    const person: Person = { id: 'p', alias: 'Ami', variants: ['Zoe'] };

    // Act
    const result = pseudonymize('Avec Zoé hier', [person]);

    // Assert
    expect(result).toBe('Avec [Ami] hier');
  });

  it('should replace names next to punctuation', () => {
    // Arrange
    const text = 'Marie, "Marie" (Marie); Marie! d\'Marie. Marie?';

    // Act
    const result = pseudonymize(text, [partner]);

    // Assert
    expect(result).toBe(
      '[Compagne], "[Compagne]" ([Compagne]); [Compagne]! d\'[Compagne]. [Compagne]?',
    );
  });

  it('should never replace inside other words', () => {
    // Arrange
    const text = 'Mariette, marier, Marielle et ammari restent intacts';

    // Act
    const result = pseudonymize(text, [partner]);

    // Assert
    expect(result).toBe(text);
  });

  it('should prefer the longest variant when variants overlap', () => {
    // Arrange
    const text = 'Jean-Pierre est passé, puis Jean.';

    // Act
    const result = pseudonymize(text, [boss]);

    // Assert
    expect(result).toBe('[Chef] est passé, puis [Chef].');
  });

  it('should handle several people and return the text unchanged without people', () => {
    // Arrange
    const text = 'Marie et Jean sont venus.';

    // Act
    const replaced = pseudonymize(text, [partner, boss]);
    const untouched = pseudonymize(text, []);

    // Assert
    expect(replaced).toBe('[Compagne] et [Chef] sont venus.');
    expect(untouched).toBe(text);
  });

  it('should handle decomposed accents in the text', () => {
    // Arrange
    const person: Person = { id: 'p', alias: 'Mere', variants: ['Hélène'] };
    const text = 'Héléne est la';

    // Act
    const result = pseudonymize(text, [person]);

    // Assert
    expect(result).toBe('[Mere] est la');
  });

  it('should ignore empty variants', () => {
    // Arrange
    const person: Person = { id: 'p', alias: 'X', variants: ['  '] };

    // Act
    const result = pseudonymize('rien à changer', [person]);

    // Assert
    expect(result).toBe('rien à changer');
  });
});
