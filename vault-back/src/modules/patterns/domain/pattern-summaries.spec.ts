import {
  buildBeforeItem,
  buildChangePoint,
  buildFinding,
  buildReport,
  buildTarget,
} from './pattern-fixtures.js';
import { buildPatternReportView } from './pattern-report-view.js';
import {
  formatFrenchDate,
  formatFrenchNumber,
  summarizeBeforeDifficultItem,
  summarizeChangePoint,
  summarizeFinding,
  summarizeScoreTextGap,
} from './pattern-summaries.js';

const FORBIDDEN_WORDS = [
  'devrais',
  'risque',
  'dépression',
  'à cause',
  'trouble',
  'symptôme',
];

function expectCalm(sentence: string): void {
  for (const word of FORBIDDEN_WORDS) {
    expect(sentence.toLowerCase()).not.toContain(word);
  }
}

describe('pattern summaries', () => {
  describe('formatFrenchNumber', () => {
    it('should use a comma and one decimal', () => {
      // Arrange / Act
      const result = formatFrenchNumber(1.26);

      // Assert
      expect(result).toBe('1,3');
    });

    it('should never print a negative zero', () => {
      expect(formatFrenchNumber(-0.04)).toBe('0,0');
    });
  });

  describe('formatFrenchDate', () => {
    it('should spell the month in French', () => {
      expect(formatFrenchDate('2026-02-14')).toBe('14 février 2026');
      expect(formatFrenchDate('2026-03-01')).toBe('1er mars 2026');
    });
  });

  describe('summarizeFinding', () => {
    it('should describe a same-day binary finding', () => {
      // Arrange
      const finding = buildFinding();

      // Act
      const sentence = summarizeFinding(finding, 'Humeur');

      // Assert
      expect(sentence).toBe(
        'Les jours où « Sport » apparaît dans ta note, la valeur de « Humeur » est en moyenne plus haute de 1,3 point (comparé sur 60 jours, dont 14 avec et 30 sans).',
      );
    });

    it('should describe a next-day finding and a lower target', () => {
      // Arrange
      const base = buildFinding();
      const finding = buildFinding({
        lag: 1,
        effect: { ...base.effect!, difference: -0.84 },
      });

      // Act
      const sentence = summarizeFinding(finding, 'Humeur');

      // Assert
      expect(sentence).toBe(
        'Le lendemain des jours où « Sport » apparaît dans ta note, la valeur de « Humeur » est en moyenne plus basse de 0,8 point (comparé sur 60 jours, dont 14 avec et 30 sans).',
      );
    });

    it('should describe a continuous predictor with top versus bottom third', () => {
      // Arrange
      const finding = buildFinding({
        key: 'rumination',
        label: 'Rumination',
        effect: {
          kind: 'continuous',
          meanWhenHigh: 4,
          meanWhenLow: 6,
          countHigh: 20,
          countLow: 20,
          difference: -2,
        },
      });

      // Act
      const sentence = summarizeFinding(finding, 'Humeur');

      // Assert
      expect(sentence).toBe(
        'Les jours où la valeur de « Rumination » lue dans ta note est parmi les plus hautes (le tiers le plus haut), la valeur de « Humeur » est en moyenne plus basse de 2,0 points (comparé sur 60 jours ; tiers haut : 20 jours, tiers bas : 20 jours) que les jours où cette valeur est parmi les plus basses.',
      );
    });

    it('should describe the day after a missing log', () => {
      // Arrange
      const finding = buildFinding({
        key: 'no_log_previous_day',
        label: 'Veille sans saisie',
        category: 'logging',
      });

      // Act
      const sentence = summarizeFinding(finding, 'Humeur');

      // Assert
      expect(
        sentence.startsWith(
          'Après un jour sans saisie, la valeur de « Humeur »',
        ),
      ).toBe(true);
    });

    it('should append the unit of the target when known', () => {
      // Arrange / Act
      const sentence = summarizeFinding(buildFinding(), 'Sommeil', 'h');

      // Assert
      expect(sentence).toContain('plus haute de 1,3 h');
    });

    it('should fall back on the direction of the correlation without effect', () => {
      // Arrange
      const finding = buildFinding({ effect: null, rho: -0.3 });

      // Act
      const sentence = summarizeFinding(finding, 'Humeur');

      // Assert
      expect(sentence).toContain('a tendance à être plus bas');
    });

    it('should stay calm for every variant', () => {
      // Arrange
      const variants = [
        buildFinding(),
        buildFinding({ lag: 1, favourable: false }),
        buildFinding({ effect: null }),
        buildFinding({
          key: 'no_log_previous_day',
          label: 'Veille sans saisie',
        }),
      ];

      // Act / Assert
      variants.forEach((finding) =>
        expectCalm(summarizeFinding(finding, 'Humeur')),
      );
    });
  });

  describe('summarizeBeforeDifficultItem', () => {
    it('should say the item comes back more often', () => {
      // Arrange / Act
      const sentence = summarizeBeforeDifficultItem(buildBeforeItem());

      // Assert
      expect(sentence).toBe(
        '« Tension » est présent 6 fois sur 12 jours dans les 3 jours avant tes journées difficiles, contre 13 % des autres jours.',
      );
    });

    it('should phrase a lift under 1 as rarer', () => {
      // Arrange
      const item = buildBeforeItem({
        label: 'Sport',
        countBefore: 1,
        frequencyBefore: 0.08,
        frequencyOther: 0.4,
        lift: 0.2,
      });

      // Act
      const sentence = summarizeBeforeDifficultItem(item);

      // Assert
      expect(sentence).toBe(
        '« Sport » est présent 1 fois sur 12 jours dans les 3 jours avant tes journées difficiles, contre 40 % des autres jours.',
      );
    });

    it('should treat a null lift by the real frequencies', () => {
      // Arrange
      const item = buildBeforeItem({
        countOther: 0,
        frequencyOther: 0,
        lift: null,
      });

      // Act
      const sentence = summarizeBeforeDifficultItem(item);

      // Assert
      expect(sentence).toContain('contre 0 % des autres jours');
      expectCalm(sentence);
    });
  });

  describe('summarizeChangePoint', () => {
    it('should give the date and both averages', () => {
      // Arrange / Act
      const sentence = summarizeChangePoint(buildChangePoint());

      // Assert
      expect(sentence).toBe(
        'Depuis le 1er mars 2026, la moyenne de « Humeur » est passée de 6,0 à 4,6.',
      );
      expectCalm(sentence);
    });
  });

  describe('summarizeScoreTextGap', () => {
    it('should be a question', () => {
      // Arrange / Act
      const sentence = summarizeScoreTextGap({
        date: '2026-04-12',
        targetValue: 8,
        toneValue: 2,
        targetPercentile: 0.9,
        tonePercentile: 0.1,
      });

      // Assert
      expect(sentence).toBe(
        "Le 12 avril 2026, ton score et le ton de ta note semblent raconter des choses différentes. Qu'est-ce qui se passait ?",
      );
      expectCalm(sentence);
    });
  });

  describe('buildPatternReportView', () => {
    it('should add summaries and flag targets that are no longer valid', () => {
      // Arrange
      const report = buildReport({
        targets: [
          buildTarget(),
          buildTarget({ fieldId: 'field-2', label: 'Sommeil' }),
        ],
      });

      // Act
      const view = buildPatternReportView(report, new Set(['field-1']));

      // Assert
      expect(view.targets[0].targetStillValid).toBe(true);
      expect(view.targets[1].targetStillValid).toBe(false);
      expect(view.targets[0].findings[0].summary).toContain('Sport');
      expect(
        view.targets[0].beforeDifficultDays?.items[0].moreFrequentBefore,
      ).toBe(true);
      expect(view.targets[0].changePoints[0].summary).toContain('Depuis le');
    });
  });
});
