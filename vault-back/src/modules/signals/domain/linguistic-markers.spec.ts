import { computeLinguisticMarkers } from './linguistic-markers.js';

describe('computeLinguisticMarkers', () => {
  it('should count words and ratios', () => {
    // Arrange
    const text = 'Je ne fais jamais rien de mon côté';

    // Act
    const markers = computeLinguisticMarkers(text);

    // Assert
    expect(markers.wordCount).toBe(8);
    expect(markers.absolutistRatio).toBeCloseTo(2 / 8);
    expect(markers.firstPersonRatio).toBeCloseTo(2 / 8);
  });

  it('should be accent and case insensitive', () => {
    // Arrange
    const text = 'COMPLÈTEMENT épuisé, Entièrement vidé';

    // Act
    const markers = computeLinguisticMarkers(text);

    // Assert
    expect(markers.absolutistRatio).toBeCloseTo(2 / 4);
  });

  it('should split elisions so j and m count as first person', () => {
    // Arrange
    const text = "J'ai peur qu'on m'oublie";

    // Act
    const markers = computeLinguisticMarkers(text);

    // Assert
    expect(markers.wordCount).toBe(7);
    expect(markers.firstPersonRatio).toBeCloseTo(2 / 7);
  });

  it('should return zeros for an empty text', () => {
    // Arrange
    const text = '  ...  ';

    // Act
    const markers = computeLinguisticMarkers(text);

    // Assert
    expect(markers).toEqual({
      wordCount: 0,
      absolutistRatio: 0,
      firstPersonRatio: 0,
    });
  });
});
