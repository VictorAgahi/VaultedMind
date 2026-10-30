import type {
  BeforeDifficultDaysItem,
  ChangePointFinding,
  PatternFinding,
  PatternReport,
  TargetReport,
} from './pattern-types.js';

export function buildFinding(
  overrides: Partial<PatternFinding> = {},
): PatternFinding {
  return {
    key: 'physical_activity',
    label: 'Sport',
    category: 'event',
    lag: 0,
    rho: 0.4,
    partial: false,
    n: 60,
    p: 0.001,
    q: 0.02,
    strength: 'solide',
    effect: {
      kind: 'binary',
      meanWhenHigh: 7.4,
      meanWhenLow: 6.1,
      countHigh: 14,
      countLow: 30,
      difference: 1.3,
    },
    favourable: true,
    exampleDates: ['2026-03-02'],
    ...overrides,
  };
}

export function buildBeforeItem(
  overrides: Partial<BeforeDifficultDaysItem> = {},
): BeforeDifficultDaysItem {
  return {
    key: 'conflict',
    label: 'Tension',
    category: 'event',
    countBefore: 6,
    daysBefore: 12,
    countOther: 5,
    daysOther: 40,
    frequencyBefore: 0.5,
    frequencyOther: 0.125,
    lift: 4,
    p: 0.01,
    q: 0.04,
    ...overrides,
  };
}

export function buildChangePoint(
  overrides: Partial<ChangePointFinding> = {},
): ChangePointFinding {
  return {
    key: 'mood',
    label: 'Humeur',
    date: '2026-03-01',
    meanBefore: 6.04,
    meanAfter: 4.55,
    difference: -1.49,
    differenceInSd: -1.2,
    p: 0.01,
    favourable: false,
    ...overrides,
  };
}

export function buildTarget(
  overrides: Partial<TargetReport> = {},
): TargetReport {
  return {
    fieldId: 'field-1',
    key: 'field:field-1',
    label: 'Humeur',
    direction: 'HIGHER_IS_BETTER',
    testsRun: 40,
    findings: [buildFinding()],
    beforeDifficultDays: {
      difficultDayCount: 5,
      items: [buildBeforeItem()],
    },
    changePoints: [buildChangePoint()],
    scoreTextGaps: [],
    ...overrides,
  };
}

export function buildReport(
  overrides: Partial<PatternReport> = {},
): PatternReport {
  return {
    engineVersion: 'patterns-v1',
    computedAt: '2026-10-29T03:30:00.000Z',
    daysCovered: 70,
    daysLogged: 62,
    status: 'ok',
    requiredLoggedDays: 30,
    targets: [buildTarget()],
    stateChangePoints: [],
    ...overrides,
  };
}
