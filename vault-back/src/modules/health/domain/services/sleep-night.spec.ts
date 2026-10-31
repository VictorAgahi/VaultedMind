import {
  classifySleepLabel,
  classifySleepStage,
  computeSleepNight,
  parseSleepInstant,
  parseSleepLines,
  SleepSample,
} from './sleep-night.js';

function sample(value: string, start: string, end: string): SleepSample {
  return { value, start: new Date(start), end: new Date(end) };
}

describe('computeSleepNight', () => {
  const paris = 'Europe/Paris';

  it('should merge overlapping stages and sources so no minute counts twice', () => {
    // Arrange (CET, UTC+1): in bed 22:30-07:00, asleep stages 23:00-06:30 from two sources
    const samples = [
      sample('InBed', '2026-01-14T22:30:00+01:00', '2026-01-15T07:00:00+01:00'),
      sample('Core', '2026-01-14T23:00:00+01:00', '2026-01-15T02:00:00+01:00'),
      sample('Deep', '2026-01-15T02:00:00+01:00', '2026-01-15T04:00:00+01:00'),
      sample('REM', '2026-01-15T04:00:00+01:00', '2026-01-15T06:30:00+01:00'),
      sample('Core', '2026-01-14T23:30:00+01:00', '2026-01-15T05:00:00+01:00'),
      sample('Awake', '2026-01-15T03:00:00+01:00', '2026-01-15T03:10:00+01:00'),
    ];

    // Act
    const { summary } = computeSleepNight(samples, '2026-01-15', paris);

    // Assert
    expect(summary?.source).toBe('asleep');
    expect(summary?.asleepHours).toBeCloseTo(7.5, 5);
    expect(summary?.bedtimeHour).toBeCloseTo(23, 5);
  });

  it('should count the French iOS labels "Lent" and "Réveillé" seen on a real phone', () => {
    // Arrange: a French iPhone names core sleep "Lent" and awake time "Réveillé"
    const samples = [
      sample('Lent', '2026-01-14T23:00:00+01:00', '2026-01-15T03:00:00+01:00'),
      sample(
        'Profond',
        '2026-01-15T03:00:00+01:00',
        '2026-01-15T04:30:00+01:00',
      ),
      sample(
        'Réveillé',
        '2026-01-15T04:30:00+01:00',
        '2026-01-15T04:45:00+01:00',
      ),
      sample(
        'Paradoxal',
        '2026-01-15T04:45:00+01:00',
        '2026-01-15T06:15:00+01:00',
      ),
      sample('Lent', '2026-01-15T06:15:00+01:00', '2026-01-15T08:00:00+01:00'),
    ];

    // Act
    const result = computeSleepNight(samples, '2026-01-15', paris);

    // Assert: 4 h + 1.5 h + 1.5 h + 1.75 h asleep, the 15 min awake excluded
    expect(result.unknownLabels).toEqual([]);
    expect(result.summary?.asleepHours).toBeCloseTo(8.75, 5);
    expect(result.stages.core).toBeCloseTo(5.75, 5);
    expect(result.stages.awake).toBeCloseTo(0.25, 5);
  });

  it('should return the bedtime as a time of day after midnight', () => {
    // Arrange
    const samples = [
      sample(
        'Asleep',
        '2026-01-15T00:30:00+01:00',
        '2026-01-15T07:30:00+01:00',
      ),
    ];

    // Act
    const { summary } = computeSleepNight(samples, '2026-01-15', paris);

    // Assert
    expect(summary?.bedtimeHour).toBeCloseTo(0.5, 5);
    expect(summary?.asleepHours).toBeCloseTo(7, 5);
  });

  it('should read the window in the user timezone and clip at its boundaries', () => {
    // Arrange: window for Paris in January is 2026-01-14T17:00Z to 2026-01-15T17:00Z
    const samples = [
      sample('Asleep', '2026-01-14T16:00:00Z', '2026-01-14T18:00:00Z'),
      sample('Asleep', '2026-01-15T16:00:00Z', '2026-01-15T19:00:00Z'),
    ];

    // Act
    const { summary } = computeSleepNight(samples, '2026-01-15', paris);

    // Assert: 1 h after the start boundary + 1 h before the end boundary
    expect(summary?.asleepHours).toBeCloseTo(2, 5);
    expect(summary?.bedtimeHour).toBeCloseTo(18, 5);
  });

  it('should ignore a night that belongs to another day', () => {
    // Arrange
    const samples = [
      sample(
        'Asleep',
        '2026-01-13T23:00:00+01:00',
        '2026-01-14T07:00:00+01:00',
      ),
    ];

    // Act
    const { summary } = computeSleepNight(samples, '2026-01-15', paris);

    // Assert
    expect(summary).toBeNull();
  });

  it('should follow daylight saving time in the window', () => {
    // Arrange: night of the spring change (clocks go forward on 2026-03-29), CEST afterwards
    const samples = [
      sample(
        'Asleep',
        '2026-03-28T23:00:00+01:00',
        '2026-03-29T07:00:00+02:00',
      ),
    ];

    // Act
    const { summary } = computeSleepNight(samples, '2026-03-29', paris);

    // Assert: 7 h of real time, bedtime 23:00 local
    expect(summary?.asleepHours).toBeCloseTo(7, 5);
    expect(summary?.bedtimeHour).toBeCloseTo(23, 5);
  });

  it('should use another timezone for the window', () => {
    // Arrange: in New York (UTC-5) the night 23:00-07:00 local is 04:00Z-12:00Z
    const samples = [
      sample('Asleep', '2026-01-15T04:00:00Z', '2026-01-15T12:00:00Z'),
    ];

    // Act
    const { summary } = computeSleepNight(
      samples,
      '2026-01-15',
      'America/New_York',
    );

    // Assert
    expect(summary?.asleepHours).toBeCloseTo(8, 5);
    expect(summary?.bedtimeHour).toBeCloseTo(23, 5);
  });

  it('should fall back to the in-bed time when no asleep stage exists', () => {
    // Arrange
    const samples = [
      sample(
        'In Bed',
        '2026-01-14T23:00:00+01:00',
        '2026-01-15T06:00:00+01:00',
      ),
      sample('Awake', '2026-01-15T03:00:00+01:00', '2026-01-15T03:15:00+01:00'),
    ];

    // Act
    const { summary } = computeSleepNight(samples, '2026-01-15', paris);

    // Assert
    expect(summary?.source).toBe('in_bed');
    expect(summary?.asleepHours).toBeCloseTo(7, 5);
  });

  it('should ignore unknown labels and report each distinct one once', () => {
    // Arrange
    const samples = [
      sample(
        'Mystery',
        '2026-01-14T23:00:00+01:00',
        '2026-01-15T01:00:00+01:00',
      ),
      sample(
        'Mystery',
        '2026-01-15T01:00:00+01:00',
        '2026-01-15T02:00:00+01:00',
      ),
      sample('Autre', '2026-01-15T02:00:00+01:00', '2026-01-15T03:00:00+01:00'),
      sample('Deep', '2026-01-15T03:00:00+01:00', '2026-01-15T05:00:00+01:00'),
    ];

    // Act
    const result = computeSleepNight(samples, '2026-01-15', paris);

    // Assert
    expect(result.unknownLabels).toEqual(['Mystery', 'Autre']);
    expect(result.unknownSampleCount).toBe(3);
    expect(result.summary?.asleepHours).toBeCloseTo(2, 5);
  });

  it('should ignore empty or reversed samples', () => {
    // Arrange
    const samples = [
      sample(
        'Asleep',
        '2026-01-15T02:00:00+01:00',
        '2026-01-15T02:00:00+01:00',
      ),
      sample(
        'Asleep',
        '2026-01-15T05:00:00+01:00',
        '2026-01-15T04:00:00+01:00',
      ),
    ];

    // Act
    const { summary } = computeSleepNight(samples, '2026-01-15', paris);

    // Assert
    expect(summary).toBeNull();
  });
});

describe('classifySleepLabel', () => {
  it.each([
    ['Asleep', 'asleep'],
    ['Core', 'asleep'],
    ['Deep', 'asleep'],
    ['REM', 'asleep'],
    ['AsleepUnspecified', 'asleep'],
    ['Asleep (Core)', 'asleep'],
    ['asleep (deep)', 'asleep'],
    ['Endormi', 'asleep'],
    ['Endormie', 'asleep'],
    ['Sommeil léger', 'asleep'],
    ['Sommeil central', 'asleep'],
    ['Sommeil essentiel', 'asleep'],
    ['Sommeil paradoxal', 'asleep'],
    ['Sommeil profond', 'asleep'],
    ['Paradoxal', 'asleep'],
    ['PROFOND', 'asleep'],
    ['InBed', 'in_bed'],
    ['In Bed', 'in_bed'],
    ['Au lit', 'in_bed'],
    ['Awake', 'awake'],
    ['Éveillé', 'awake'],
    ['Eveillee', 'awake'],
    ['Nap', 'unknown'],
    ['', 'unknown'],
  ])('should classify %p as %s', (label, expected) => {
    expect(classifySleepLabel(label)).toBe(expected);
  });
});

describe('parseSleepInstant', () => {
  it('should read an offset or Z string as the instant it designates', () => {
    expect(
      parseSleepInstant(
        '2026-01-15T07:00:00+01:00',
        'Asia/Tokyo',
      )?.toISOString(),
    ).toBe('2026-01-15T06:00:00.000Z');
    expect(
      parseSleepInstant('2026-01-15T07:00:00Z', 'Asia/Tokyo')?.toISOString(),
    ).toBe('2026-01-15T07:00:00.000Z');
  });

  it('should read a string without offset in the user timezone', () => {
    expect(
      parseSleepInstant('2026-01-15T07:00:00', 'Europe/Paris')?.toISOString(),
    ).toBe('2026-01-15T06:00:00.000Z');
    expect(
      parseSleepInstant('2026-07-15 07:00', 'Europe/Paris')?.toISOString(),
    ).toBe('2026-07-15T05:00:00.000Z');
  });

  it('should return null for text that is not a time', () => {
    expect(parseSleepInstant('yesterday', 'Europe/Paris')).toBeNull();
    expect(parseSleepInstant('', 'Europe/Paris')).toBeNull();
  });
});

describe('parseSleepLines', () => {
  it('should parse label|start|end lines and drop malformed ones', () => {
    // Arrange
    const text = [
      'Core|2026-01-15T00:00:00+01:00|2026-01-15T02:00:00+01:00',
      '',
      'broken line',
      'Deep|2026-01-15T02:00:00+01:00',
      ' REM | 2026-01-15T02:00:00+01:00 | 2026-01-15T03:00:00+01:00 ',
    ].join('\r\n');

    // Act
    const samples = parseSleepLines(text);

    // Assert
    expect(samples).toEqual([
      {
        value: 'Core',
        start: '2026-01-15T00:00:00+01:00',
        end: '2026-01-15T02:00:00+01:00',
      },
      {
        value: 'REM',
        start: '2026-01-15T02:00:00+01:00',
        end: '2026-01-15T03:00:00+01:00',
      },
    ]);
  });
});

describe('sleep stages', () => {
  const paris = 'Europe/Paris';

  it('should sum each stage with overlaps merged per stage', () => {
    // Arrange
    const samples = [
      sample('Deep', '2026-01-15T01:00:00+01:00', '2026-01-15T02:00:00+01:00'),
      sample('Deep', '2026-01-15T01:30:00+01:00', '2026-01-15T02:30:00+01:00'),
      sample('REM', '2026-01-15T03:00:00+01:00', '2026-01-15T04:30:00+01:00'),
      sample('Core', '2026-01-15T00:00:00+01:00', '2026-01-15T01:00:00+01:00'),
      sample('Core', '2026-01-15T04:30:00+01:00', '2026-01-15T06:00:00+01:00'),
      sample('Awake', '2026-01-15T02:30:00+01:00', '2026-01-15T02:45:00+01:00'),
    ];

    // Act
    const { stages } = computeSleepNight(samples, '2026-01-15', paris);

    // Assert
    expect(stages.deep).toBeCloseTo(1.5, 5);
    expect(stages.rem).toBeCloseTo(1.5, 5);
    expect(stages.core).toBeCloseTo(2.5, 5);
    expect(stages.awake).toBeCloseTo(0.25, 5);
  });

  it.each([
    ['Profond', 'deep'],
    ['Sommeil profond', 'deep'],
    ['Paradoxal', 'rem'],
    ['Asleep (REM)', 'rem'],
    ['Léger', 'core'],
    ['Essentiel', 'core'],
    ['Central', 'core'],
    ['Asleep (Core)', 'core'],
    ['Éveillé', 'awake'],
    ['Awake', 'awake'],
  ])('should read the label %p as the stage %p', (label, expected) => {
    // Arrange / Act
    const stage = classifySleepStage(label);

    // Assert
    expect(stage).toBe(expected);
  });

  it('should return no stage for an iPhone without a Watch', () => {
    // Arrange
    const samples = [
      sample(
        'Asleep',
        '2026-01-15T00:00:00+01:00',
        '2026-01-15T07:00:00+01:00',
      ),
      sample('InBed', '2026-01-14T23:30:00+01:00', '2026-01-15T07:30:00+01:00'),
    ];

    // Act
    const { stages, summary } = computeSleepNight(samples, '2026-01-15', paris);

    // Assert
    expect(stages).toEqual({});
    expect(summary?.asleepHours).toBeCloseTo(7, 5);
  });

  it('should ignore stage samples outside the night window', () => {
    // Arrange
    const samples = [
      sample('Deep', '2026-01-15T19:00:00+01:00', '2026-01-15T20:00:00+01:00'),
    ];

    // Act
    const { stages } = computeSleepNight(samples, '2026-01-15', paris);

    // Assert
    expect(stages).toEqual({});
  });
});
