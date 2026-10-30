import { assessDistress } from './distress-detector.js';

describe('assessDistress', () => {
  it.each([
    "J'ai envie de mourir ce soir",
    'Je pense au suicide depuis quelques jours',
    'Je veux en finir avec tout ça',
    'Parfois je me fais du mal, je voudrais me scarifier',
    'Tout le monde serait mieux sans moi',
    "J'ai plus envie de vivre",
  ])('should flag "%s" as a crisis', (text: string) => {
    // Arrange
    const texts = [text];

    // Act
    const assessment = assessDistress(texts);

    // Assert
    expect(assessment.level).toBe('crisis');
    expect(assessment.matchedPhrases.length).toBeGreaterThan(0);
  });

  it('should ignore accents and casing', () => {
    // Arrange
    const texts = ['JE SUIS DÉSESPÉRÉ'];

    // Act
    const assessment = assessDistress(texts);

    // Assert
    expect(assessment.level).toBe('concern');
  });

  it('should not flag ordinary entries', () => {
    // Arrange
    const texts = [
      'Bonne journée, marche au parc et dîner entre amis.',
      'Fatigué mais content, séance de sport ce matin.',
    ];

    // Act
    const assessment = assessDistress(texts);

    // Assert
    expect(assessment).toEqual({ level: 'none', matchedPhrases: [] });
  });

  it('should not match a phrase inside a longer word', () => {
    // Arrange
    const texts = ['Je me suis suicidairement documenté sur la prévention'];

    // Act
    const assessment = assessDistress(texts);

    // Assert
    expect(assessment.level).toBe('none');
  });
});
