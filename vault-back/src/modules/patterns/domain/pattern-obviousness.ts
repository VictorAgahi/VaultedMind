import type { JevAnswer, JevQuestion } from '../../signals/domain/jev-types.js';
import type {
  LinkObviousness,
  PatternFinding,
  PatternReport,
  TargetReport,
} from './pattern-types.js';

export const OBVIOUS_MIN_LEVEL = 2;
export const OBVIOUS_MIN_CONFIDENCE = 0.5;
export const OBVIOUSNESS_MAX_LEVEL = 3;
export const OBVIOUSNESS_QUESTION_KEY = 'obviousness';
/** Safety cap on the number of Jev requests of one report. */
export const MAX_OBVIOUSNESS_REQUESTS = 120;
export const MAX_OBVIOUS_OVERRIDES = 1000;

export type PatternObviousOverrides = Record<string, boolean>;
export type ObviousSource = 'user' | 'jev';

export interface ObviousVerdict {
  obvious: boolean;
  source: ObviousSource | null;
}

/**
 * Identity of a link across nightly runs: predictor, target, lag and sign of the relation.
 * Used to reuse the AI score and to store the user's verdict.
 */
export function buildFindingKey(
  targetKey: string,
  finding: Pick<PatternFinding, 'key' | 'lag' | 'rho'>,
): string {
  const sign = finding.rho >= 0 ? '+' : '-';
  return `${finding.key}|${targetKey}|${finding.lag}|${sign}`;
}

function predictorPart(finding: PatternFinding): string {
  return finding.effect?.kind === 'binary'
    ? `La présence de « ${finding.label} » est associée à`
    : `Un niveau plus élevé de « ${finding.label} » est associé à`;
}

function targetPart(finding: PatternFinding, target: TargetReport): string {
  const positive = finding.rho >= 0;
  if (target.binary) {
    return `${positive ? 'une présence plus fréquente' : 'une présence plus rare'} de « ${target.label} »`;
  }
  return `${positive ? 'un niveau plus élevé' : 'un niveau plus bas'} de « ${target.label} »`;
}

/** Neutral French statement of the link, without any figure; this is what the AI judges. */
export function describeLink(
  finding: PatternFinding,
  target: TargetReport,
): string {
  const when = finding.lag === 1 ? ' le lendemain' : ' le même jour';
  return `${predictorPart(finding)} ${targetPart(finding, target)}${when}.`;
}

export function buildObviousnessQuestion(): JevQuestion {
  return {
    type: 'score',
    instructions:
      'À quel point ce lien est-il évident ou attendu pour la plupart des gens ?',
    criteria: [
      'Surprenant',
      'Plausible mais pas évident',
      'Attendu',
      'Évident pour tout le monde',
    ],
  };
}

export function parseObviousnessAnswer(
  answer: JevAnswer | undefined,
): LinkObviousness | null {
  if (!answer || answer.type !== 'score') return null;
  if (!Number.isFinite(answer.score)) return null;
  return {
    level: Math.min(Math.max(answer.score, 0), OBVIOUSNESS_MAX_LEVEL),
    confidence: answer.confidence,
  };
}

export function isObviousByScore(
  obviousness: LinkObviousness | null | undefined,
): boolean {
  if (!obviousness) return false;
  return (
    Math.round(obviousness.level) >= OBVIOUS_MIN_LEVEL &&
    obviousness.confidence >= OBVIOUS_MIN_CONFIDENCE
  );
}

/** The user's verdict beats the AI score; without a score a link is treated as not obvious. */
export function resolveObviousness(
  finding: PatternFinding,
  findingKey: string,
  overrides: PatternObviousOverrides,
): ObviousVerdict {
  const override = overrides[findingKey];
  if (typeof override === 'boolean') {
    return { obvious: override, source: 'user' };
  }
  if (finding.obviousness) {
    return { obvious: isObviousByScore(finding.obviousness), source: 'jev' };
  }
  return { obvious: false, source: null };
}

/** Scores of the previous report by finding key, so that known links are not asked again. */
export function collectKnownObviousness(
  report: PatternReport | null,
): Map<string, LinkObviousness> {
  const known = new Map<string, LinkObviousness>();
  for (const target of report?.targets ?? []) {
    for (const finding of target.findings) {
      if (finding.obviousness) {
        known.set(buildFindingKey(target.key, finding), finding.obviousness);
      }
    }
  }
  return known;
}

export interface FindingSplit {
  main: PatternFinding[];
  expected: PatternFinding[];
}

/** Splits the findings of a target into the ones worth showing and the obvious ones. */
export function splitByObviousness(
  target: TargetReport,
  overrides: PatternObviousOverrides,
): FindingSplit {
  const split: FindingSplit = { main: [], expected: [] };
  for (const finding of target.findings) {
    const verdict = resolveObviousness(
      finding,
      buildFindingKey(target.key, finding),
      overrides,
    );
    (verdict.obvious ? split.expected : split.main).push(finding);
  }
  return split;
}
