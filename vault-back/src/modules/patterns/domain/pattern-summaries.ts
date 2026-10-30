import { NO_LOG_PREVIOUS_DAY_KEY } from './pattern-engine.js';
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

function withUnit(value: number, unit: string | undefined): string {
  const text = formatFrenchNumber(Math.abs(value));
  return unit ? `${text} ${unit}` : text;
}

function daysLabel(count: number): string {
  return count > 1 ? `${count} jours` : `${count} jour`;
}

function predictorPhrase(finding: PatternFinding): string {
  const isContinuous = finding.effect?.kind === 'continuous';
  if (finding.key === NO_LOG_PREVIOUS_DAY_KEY) {
    return 'Après un jour sans saisie,';
  }
  if (isContinuous) {
    return finding.lag === 1
      ? `Le lendemain des jours où « ${finding.label} » est plus élevé,`
      : `Quand « ${finding.label} » est plus élevé,`;
  }
  return finding.lag === 1
    ? `Le lendemain des jours où « ${finding.label} » est présent,`
    : `Les jours où « ${finding.label} » est présent,`;
}

function percentLabel(frequency: number): string {
  return `${Math.round(frequency * 100)} %`;
}

/** Where the predictor stands in time, to be read after "est plus fréquent". */
function conditionPhrase(finding: PatternFinding): string {
  const isContinuous = finding.effect?.kind === 'continuous';
  if (finding.key === NO_LOG_PREVIOUS_DAY_KEY)
    return 'après un jour sans saisie';
  if (isContinuous) {
    return finding.lag === 1
      ? `le lendemain des jours où « ${finding.label} » est plus élevé`
      : `quand « ${finding.label} » est plus élevé`;
  }
  return finding.lag === 1
    ? `le lendemain des jours où « ${finding.label} » est présent`
    : `les jours où « ${finding.label} » est présent`;
}

/**
 * Sentence for a yes/no target (a value of a text field): the effect is a difference in
 * frequency, told in shares of days. The label is used instead of "tu" or "ton".
 */
function summarizeBinaryTargetFinding(
  finding: PatternFinding,
  effect: NonNullable<PatternFinding['effect']>,
  targetLabel: string,
): string {
  const condition = conditionPhrase(finding);
  const shares = `${percentLabel(effect.meanWhenHigh)} des jours contre ${percentLabel(effect.meanWhenLow)}`;
  if (Math.round(effect.difference * 100) === 0) {
    return `« ${targetLabel} » reste à peu près aussi fréquent ${condition} (${shares}).`;
  }
  const comparison = effect.difference > 0 ? 'plus fréquent' : 'plus rare';
  return `« ${targetLabel} » est ${comparison} ${condition} (${shares}).`;
}

/** One calm French sentence describing a finding; never advice, blame or diagnosis. */
export function summarizeFinding(
  finding: PatternFinding,
  targetLabel: string,
  unit?: string,
): string {
  const lead = predictorPhrase(finding);
  const effect = finding.effect;
  if (effect?.targetBinary) {
    return summarizeBinaryTargetFinding(finding, effect, targetLabel);
  }
  if (!effect) {
    const tendency = finding.rho >= 0 ? 'plus haut' : 'plus bas';
    return `${lead} ${targetLabel} a tendance à être ${tendency}.`;
  }
  const amount = withUnit(effect.difference, unit);
  const sample = `sur ${daysLabel(effect.countHigh)}`;
  if (formatFrenchNumber(effect.difference) === '0,0') {
    return `${lead} ${targetLabel} reste en moyenne presque identique (${sample}).`;
  }
  const direction = effect.difference > 0 ? 'plus haut' : 'plus bas';
  const comparison =
    effect.kind === 'continuous' ? ' que quand il est plus bas' : '';
  return `${lead} ${targetLabel} est en moyenne ${direction} de ${amount} (${sample})${comparison}.`;
}

export function isMoreFrequentBefore(item: BeforeDifficultDaysItem): boolean {
  return item.frequencyBefore > item.frequencyOther;
}

/** Sentence for an item compared over the 3 days before the difficult days. */
export function summarizeBeforeDifficultItem(
  item: BeforeDifficultDaysItem,
  target?: Pick<TargetReport, 'binary' | 'direction' | 'label'>,
): string {
  const counts = `${item.countBefore} fois sur ${item.daysBefore}`;
  const days = target?.binary
    ? `les jours où « ${target.label} » est ${target.direction === 'LOWER_IS_BETTER' ? 'présent' : 'absent'}`
    : 'tes journées difficiles';
  if (isMoreFrequentBefore(item)) {
    return `« ${item.label} » revient plus souvent dans les 3 jours qui précèdent ${days} (${counts}).`;
  }
  return `« ${item.label} » est plus rare dans les 3 jours qui précèdent ${days} (${counts}).`;
}

export function summarizeChangePoint(
  changePoint: ChangePointFinding,
  unit?: string,
): string {
  const suffix = unit ? ` ${unit}` : '';
  return `Depuis le ${formatFrenchDate(changePoint.date)}, la moyenne de « ${changePoint.label} » est passée de ${formatFrenchNumber(changePoint.meanBefore)}${suffix} à ${formatFrenchNumber(changePoint.meanAfter)}${suffix}.`;
}

export function summarizeScoreTextGap(gap: ScoreTextGap): string {
  return `Le ${formatFrenchDate(gap.date)}, ton score et le ton de ta note semblent raconter des choses différentes. Qu'est-ce qui se passait ?`;
}
