import {
  describeSubject,
  normalizeTrackedSubject,
  ofSubject,
} from './tracked-subject.js';

describe('tracked subject', () => {
  it('should default to SELF and drop a name that does not apply', () => {
    // Act
    const unknown = normalizeTrackedSubject(undefined);
    const self = normalizeTrackedSubject({ kind: 'SELF', name: 'Mochi' });

    // Assert
    expect(unknown).toEqual({ kind: 'SELF' });
    expect(self).toEqual({ kind: 'SELF' });
  });

  it('should keep the species for an animal only and trim the texts', () => {
    // Act
    const animal = normalizeTrackedSubject({
      kind: 'ANIMAL',
      name: ' Mochi ',
      species: ' chat ',
    });
    const person = normalizeTrackedSubject({
      kind: 'OTHER_PERSON',
      name: 'Paul',
      species: 'chat',
    });

    // Assert
    expect(animal).toEqual({ kind: 'ANIMAL', name: 'Mochi', species: 'chat' });
    expect(person).toEqual({ kind: 'OTHER_PERSON', name: 'Paul' });
  });

  it('should describe the subject with its name and species', () => {
    // Act
    const both = describeSubject({
      kind: 'ANIMAL',
      name: 'Mochi',
      species: 'chat',
    });
    const speciesOnly = describeSubject({ kind: 'ANIMAL', species: 'oiseau' });
    const nothing = describeSubject({ kind: 'ANIMAL' });

    // Assert
    expect(both).toBe('Mochi (le chat)');
    expect(speciesOnly).toBe("l'oiseau");
    expect(nothing).toBe("l'animal suivi");
  });

  it('should build the possessive form', () => {
    // Assert
    expect(ofSubject({ kind: 'ANIMAL', name: 'Mochi' })).toBe('de Mochi');
    expect(ofSubject({ kind: 'ANIMAL', species: 'chat' })).toBe('du chat');
    expect(ofSubject({ kind: 'OTHER_PERSON' })).toBe('de la personne suivie');
  });
});
