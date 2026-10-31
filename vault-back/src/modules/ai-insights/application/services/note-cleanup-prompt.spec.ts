import { buildNoteCleanupPrompt } from './note-cleanup-prompt.js';

describe('buildNoteCleanupPrompt', () => {
  it('should keep the author voice for the user own journal', () => {
    // Act
    const prompt = buildNoteCleanupPrompt('je suis fatigué');

    // Assert
    expect(prompt).toContain(
      "Garde la première personne et la voix de l'auteur",
    );
    expect(prompt).not.toContain('observateur');
  });

  it('should keep the observer first person and forbid writing as the animal', () => {
    // Act
    const prompt = buildNoteCleanupPrompt('Mochi a griffé', {
      kind: 'ANIMAL',
      name: 'Mochi',
      species: 'chat',
    });

    // Assert
    expect(prompt).toContain('la première personne');
    expect(prompt).toContain('observateur');
    expect(prompt).toContain('Mochi (le chat)');
    expect(prompt).toContain("N'écris jamais comme si l'animal s'exprimait");
    expect(prompt).toContain("n'interprète rien au-delà de ce qui est écrit");
  });

  it('should forbid writing as the observed person', () => {
    // Act
    const prompt = buildNoteCleanupPrompt('Paul est triste', {
      kind: 'OTHER_PERSON',
      name: 'Paul',
    });

    // Assert
    expect(prompt).toContain('observateur');
    expect(prompt).toContain(
      "N'écris jamais comme si la personne suivie s'exprimait",
    );
  });
});
