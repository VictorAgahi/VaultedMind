import { buildSubjectStatement, subjectBlock } from './subject-prompt.js';

describe('subject statement for AI prompts', () => {
  it('should be empty for the user own journal', () => {
    // Assert
    expect(buildSubjectStatement({ kind: 'SELF' })).toBe('');
    expect(subjectBlock(undefined)).toBe('');
  });

  it('should state the animal, the vet advice and the ban on human framing', () => {
    // Act
    const statement = buildSubjectStatement({
      kind: 'ANIMAL',
      name: 'Mochi',
      species: 'chat',
    });

    // Assert
    expect(statement).toContain('UN ANIMAL');
    expect(statement).toContain('Mochi (le chat)');
    expect(statement).toContain('vétérinaire');
    expect(statement).toContain('comportementaliste');
    expect(statement).toContain('aucun cadrage de santé mentale humaine');
  });

  it('should state that the data describes another person', () => {
    // Act
    const statement = buildSubjectStatement({
      kind: 'OTHER_PERSON',
      name: 'Paul',
    });

    // Assert
    expect(statement).toContain('UNE AUTRE PERSONNE');
    expect(statement).toContain('Paul');
    expect(statement).toContain('troisième personne');
  });
});
