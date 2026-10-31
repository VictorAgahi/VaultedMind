import {
  isSelfSubject,
  ofSubject,
  type TrackedSubject,
} from '../../signals/domain/tracked-subject.js';
import { NO_LOG_PREVIOUS_DAY_KEY } from './pattern-engine.js';
import {
  isNotesCategory,
  readableLabel,
  themeTopic,
  type TargetUnit,
} from './pattern-sources.js';
import type {
  BeforeDifficultDaysItem,
  ChangePointFinding,
  PatternFinding,
  ScoreTextGap,
  TargetReport,
} from './pattern-types.js';

const MONTH_NAMES = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

export function formatFrenchNumber(value: number): string {
  const rounded = Math.round(Math.abs(value) * 10) / 10;
  const text = rounded.toFixed(1).replace('.', ',');
  return value < 0 && rounded !== 0 ? `-${text}` : text;
}

export function formatFrenchDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const dayLabel = day === 1 ? '1er' : String(day);
  return `${dayLabel} ${MONTH_NAMES[month - 1]} ${year}`;
}

const HOURS_UNIT = 'h';
const MAX_HOURS_WITH_MINUTES = 1;

/** "40 min" for 0,7 h: the nearest 5 minutes once past 10, exact below. */
function approximateMinutes(hours: number): string {
  const minutes = Math.round(Math.abs(hours) * 60);
  const rounded = minutes >= 10 ? Math.round(minutes / 5) * 5 : minutes;
  return `environ ${rounded} min`;
}

function normalizeUnit(unit: string | TargetUnit | undefined): TargetUnit {
  if (unit === undefined) return { label: '' };
  return typeof unit === 'string' ? { label: unit } : unit;
}

function pointsLabel(value: number): string {
  return Math.abs(value) >= 2 ? 'points' : 'point';
}

function withUnit(value: number, unit: TargetUnit): string {
  const scaled = Math.abs(value) * (unit.factor ?? 1);
  const text = unit.factor
    ? String(Math.round(scaled))
    : formatFrenchNumber(scaled);
  const label = unit.label || pointsLabel(scaled);
  const amount = `${text} ${label}`;
  const showMinutes =
    unit.label === HOURS_UNIT &&
    !unit.factor &&
    Math.abs(value) < MAX_HOURS_WITH_MINUTES &&
    Math.round(Math.abs(value) * 60) > 0;
  return showMinutes ? `${amount} (${approximateMinutes(value)})` : amount;
}

/** Duration told on its own for the sentence "tu dors ... de plus": minutes below an hour. */
function sleepAmount(value: number, unit: TargetUnit): string {
  const belowAnHour =
    unit.label === HOURS_UNIT &&
    !unit.factor &&
    Math.abs(value) < MAX_HOURS_WITH_MINUTES &&
    Math.round(Math.abs(value) * 60) > 0;
  return belowAnHour ? approximateMinutes(value) : withUnit(value, unit);
}

function daysLabel(count: number): string {
  return count > 1 ? `${count} jours` : `${count} jour`;
}

/**
 * What the sentence needs to know beyond the finding: the unit of the target and whether a
 * night metric (describing the night before its day) is on one side of the link.
 */
export interface FindingContext {
  targetUnit?: string | TargetUnit;
  predictorIsNight?: boolean;
  targetIsNight?: boolean;
  /** The target is the Apple Health sleep duration, which a person can be told "tu dors". */
  targetIsSleep?: boolean;
}

/** What makes the predictor "present" on a day, worded after where it was read. */
function presenceClause(
  finding: PatternFinding,
  label: string,
  subject?: TrackedSubject,
): string {
  const self = !subject || isSelfSubject(subject);
  const note = self ? 'ta note' : 'la note';
  const continuous = finding.effect?.kind === 'continuous';
  if (finding.category === 'theme') {
    const topic = themeTopic(finding.key, label, self);
    return continuous
      ? `où ${note} parle beaucoup ${topic}`
      : `où ${note} parle ${topic}`;
  }
  if (continuous) {
    const where = isNotesCategory(finding.category) ? ` dans ${note}` : '';
    return `où « ${label} » est au plus haut${where}`;
  }
  if (isNotesCategory(finding.category)) {
    return `où « ${label} » apparaît dans ${note}`;
  }
  return `où « ${label} » est présent`;
}

/** Where the predictor stands in time, to be read after "est plus fréquent". */
function conditionPhrase(
  finding: PatternFinding,
  subject?: TrackedSubject,
  context: FindingContext = {},
): string {
  if (finding.key === NO_LOG_PREVIOUS_DAY_KEY) {
    return 'après un jour sans saisie';
  }
  const label = readableLabel(finding.key, finding.label, subject);
  const clause = presenceClause(finding, label, subject);
  const nextDay = finding.lag === 1;
  if (context.predictorIsNight) {
    return nextDay
      ? `le lendemain des jours qui suivent les nuits ${clause}`
      : `après les nuits ${clause}`;
  }
  if (context.targetIsNight) {
    return nextDay
      ? `la nuit qui suit les jours ${clause}`
      : `la nuit qui précède les jours ${clause}`;
  }
  return nextDay ? `le lendemain des jours ${clause}` : `les jours ${clause}`;
}

function predictorPhrase(
  finding: PatternFinding,
  subject?: TrackedSubject,
  context?: FindingContext,
): string {
  const condition = conditionPhrase(finding, subject, context);
  return `${condition.charAt(0).toUpperCase()}${condition.slice(1)},`;
}

function percentLabel(frequency: number): string {
  return `${Math.round(frequency * 100)} %`;
}

/**
 * Sentence for a yes/no target (a value of a text field): the effect is a difference in
 * frequency, told in shares of days. The label is used instead of "tu" or "ton".
 */
function summarizeBinaryTargetFinding(
  finding: PatternFinding,
  effect: NonNullable<PatternFinding['effect']>,
  targetLabel: string,
  subject?: TrackedSubject,
  context?: FindingContext,
): string {
  const condition = conditionPhrase(finding, subject, context);
  const shares = `${percentLabel(effect.meanWhenHigh)} des jours contre ${percentLabel(effect.meanWhenLow)}`;
  if (Math.round(effect.difference * 100) === 0) {
    return `« ${targetLabel} » reste à peu près aussi fréquent ${condition} (${shares}).`;
  }
  const comparison = effect.difference > 0 ? 'plus fréquent' : 'plus rare';
  return `« ${targetLabel} » est ${comparison} ${condition} (${shares}).`;
}

/**
 * Secondary line of a card: how many days the comparison rests on; a group size is never
 * told alone. Smaller text, so it stays out of the main sentence.
 */
export function describeFindingSample(finding: PatternFinding): string {
  const total = `Comparé sur ${daysLabel(finding.n)}`;
  const effect = finding.effect;
  if (!effect) return total;
  if (effect.kind === 'continuous') {
    return `${total} · tiers haut ${effect.countHigh} j · tiers bas ${effect.countLow} j`;
  }
  return `${total} · ${daysLabel(effect.countHigh)} avec, ${effect.countLow} sans`;
}

/**
 * One calm French sentence describing a finding; never advice, blame or diagnosis.
 * The context orders a night metric first, since it describes the night before its day.
 */
export function summarizeFinding(
  finding: PatternFinding,
  targetLabel: string,
  unit?: string | TargetUnit,
  subject?: TrackedSubject,
  context: FindingContext = {},
): string {
  const lead = predictorPhrase(finding, subject, context);
  const effect = finding.effect;
  if (effect?.targetBinary) {
    return summarizeBinaryTargetFinding(
      finding,
      effect,
      targetLabel,
      subject,
      context,
    );
  }
  const label = `« ${targetLabel} »`;
  if (!effect) {
    const tendency = finding.rho >= 0 ? 'monter' : 'baisser';
    return `${lead} ${label} a tendance à ${tendency}.`;
  }
  const measure = normalizeUnit(unit ?? context.targetUnit);
  const scaled = effect.difference * (measure.factor ?? 1);
  const isZero = measure.factor
    ? Math.round(Math.abs(scaled)) === 0
    : formatFrenchNumber(effect.difference) === '0,0';
  const sleeps = context.targetIsSleep && (!subject || isSelfSubject(subject));
  if (isZero) {
    return sleeps
      ? `${lead} tu dors à peu près autant.`
      : `${lead} ${label} reste presque identique.`;
  }
  if (sleeps) {
    const more = effect.difference > 0 ? 'de plus' : 'de moins';
    return `${lead} tu dors ${sleepAmount(effect.difference, measure)} ${more}.`;
  }
  if (measure.clock) {
    const when = effect.difference > 0 ? 'plus tard' : 'plus tôt';
    return `${lead} ${label} : ${withUnit(effect.difference, measure)} ${when}.`;
  }
  const sign = effect.difference > 0 ? '+' : '-';
  return `${lead} ${label} : ${sign}${withUnit(effect.difference, measure)}.`;
}

/** "tes journées difficiles" for the user, the subject's name for someone else. */
function difficultDaysPhrase(subject?: TrackedSubject): string {
  return !subject || isSelfSubject(subject)
    ? 'tes journées difficiles'
    : `les journées difficiles ${ofSubject(subject)}`;
}

export function isMoreFrequentBefore(item: BeforeDifficultDaysItem): boolean {
  return item.frequencyBefore > item.frequencyOther;
}

/** Sentence for an item compared over the 3 days before the difficult days. */
export function summarizeBeforeDifficultItem(
  item: BeforeDifficultDaysItem,
  target?: Pick<TargetReport, 'binary' | 'direction' | 'label'>,
  subject?: TrackedSubject,
): string {
  const days = target?.binary
    ? `les jours où « ${target.label} » est ${target.direction === 'LOWER_IS_BETTER' ? 'présent' : 'absent'}`
    : difficultDaysPhrase(subject);
  const baseline = percentLabel(item.frequencyOther);
  return `« ${item.label} » : ${item.countBefore} fois sur ${daysLabel(item.daysBefore)} avant ${days}, contre ${baseline} des autres jours.`;
}

/** Secondary line of a before-difficult-days card: the window the count was read in. */
export const BEFORE_DIFFICULT_WINDOW_DETAILS =
  'Relevé dans les 3 jours qui précèdent';

export function summarizeChangePoint(
  changePoint: ChangePointFinding,
  unit?: string,
): string {
  const suffix = unit ? ` ${unit}` : '';
  return `Depuis le ${formatFrenchDate(changePoint.date)}, la moyenne de « ${changePoint.label} » est passée de ${formatFrenchNumber(changePoint.meanBefore)}${suffix} à ${formatFrenchNumber(changePoint.meanAfter)}${suffix}.`;
}

export function summarizeScoreTextGap(
  gap: ScoreTextGap,
  subject?: TrackedSubject,
): string {
  if (subject && !isSelfSubject(subject)) {
    return `Le ${formatFrenchDate(gap.date)}, le score saisi et la tonalité de la note semblent raconter des choses différentes. Qu'est-ce qui se passait ?`;
  }
  return `Le ${formatFrenchDate(gap.date)}, ton score et le ton de ta note semblent raconter des choses différentes. Qu'est-ce qui se passait ?`;
}
