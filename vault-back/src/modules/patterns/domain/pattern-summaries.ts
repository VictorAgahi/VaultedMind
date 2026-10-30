import { NO_LOG_PREVIOUS_DAY_KEY } from './pattern-engine.js';
import type {
  BeforeDifficultDaysItem,
  ChangePointFinding,
  PatternFinding,
  ScoreTextGap,
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

/** One calm French sentence describing a finding; never advice, blame or diagnosis. */
export function summarizeFinding(
  finding: PatternFinding,
  targetLabel: string,
  unit?: string,
): string {
  const lead = predictorPhrase(finding);
  const effect = finding.effect;
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
): string {
  const counts = `${item.countBefore} fois sur ${item.daysBefore}`;
  if (isMoreFrequentBefore(item)) {
    return `« ${item.label} » revient plus souvent dans les 3 jours qui précèdent tes journées difficiles (${counts}).`;
  }
  return `« ${item.label} » est plus rare dans les 3 jours qui précèdent tes journées difficiles (${counts}).`;
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
