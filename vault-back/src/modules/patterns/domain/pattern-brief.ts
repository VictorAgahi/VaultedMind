import type {
  PatternFinding,
  PatternReport,
  TargetReport,
} from './pattern-types.js';
import {
  formatFrenchDate,
  formatFrenchNumber,
  summarizeBeforeDifficultItem,
  summarizeChangePoint,
  summarizeFinding,
} from './pattern-summaries.js';

export const ENGINE_BRIEF_MAX_AGE_DAYS = 3;
export const CHAT_MAX_FINDING_LINES = 8;

const DAY_MS = 86_400_000;

/**
 * The deterministic report replaces the LLM correlation agent only when the user has the
 * advanced analysis, the report holds real results and it is recent enough.
 */
export function canUseEngineBrief(
  report: PatternReport | null,
  insightsV2Enabled: boolean,
  now: Date,
): report is PatternReport {
  if (!insightsV2Enabled || !report || report.status !== 'ok') return false;
  const computedAt = Date.parse(report.computedAt);
  if (Number.isNaN(computedAt)) return false;
  const age = now.getTime() - computedAt;
  return age >= 0 && age <= ENGINE_BRIEF_MAX_AGE_DAYS * DAY_MS;
}

function lagLabel(finding: PatternFinding): string {
  return finding.lag === 1 ? 'le lendemain' : 'le même jour';
}

function directionLabel(finding: PatternFinding): string {
  if (finding.favourable === null) return 'sens indéterminé';
  return finding.favourable
    ? 'dans le sens souhaité'
    : 'à l’inverse du sens souhaité';
}

function renderFindingLine(
  finding: PatternFinding,
  target: TargetReport,
): string {
  const details = [
    `force: ${finding.strength}`,
    `décalage: ${lagLabel(finding)}`,
    `n=${finding.n} jours`,
    `rho=${formatFrenchNumber(finding.rho)}`,
    directionLabel(finding),
  ].join(', ');
  return `- ${summarizeFinding(finding, target.label)} [${details}]`;
}

function renderTarget(target: TargetReport): string[] {
  const goal =
    target.direction === 'HIGHER_IS_BETTER'
      ? 'plus haut est mieux'
      : 'plus bas est mieux';
  const lines = [`Objectif suivi : « ${target.label} » (${goal})`];

  lines.push('Liens observés :');
  lines.push(
    ...(target.findings.length > 0
      ? target.findings.map((finding) => renderFindingLine(finding, target))
      : ['- Aucun lien assez net.']),
  );

  const items = target.beforeDifficultDays?.items ?? [];
  if (items.length > 0) {
    lines.push(
      `Avant les journées difficiles (${target.beforeDifficultDays?.difficultDayCount ?? 0} journées difficiles) :`,
    );
    lines.push(
      ...items.map(
        (item) =>
          `- ${summarizeBeforeDifficultItem(item)} [q=${formatFrenchNumber(item.q)}]`,
      ),
    );
  }

  if (target.changePoints.length > 0) {
    lines.push('Changements :');
    lines.push(
      ...target.changePoints.map(
        (changePoint) => `- ${summarizeChangePoint(changePoint)}`,
      ),
    );
  }
  return lines;
}

/** Deterministic text standing in for the correlation agent; every figure comes from the engine. */
export function renderPatternBrief(report: PatternReport): string {
  const lines = [
    `RÉSULTATS CALCULÉS (moteur statistique ${report.engineVersion}, calculés le ${formatFrenchDate(report.computedAt.slice(0, 10))}, ${report.daysLogged} jours saisis sur ${report.daysCovered}).`,
  ];
  for (const target of report.targets) {
    lines.push('', ...renderTarget(target));
  }
  if (report.stateChangePoints.length > 0) {
    lines.push('', 'Changements des signaux de ton état :');
    lines.push(
      ...report.stateChangePoints.map(
        (changePoint) => `- ${summarizeChangePoint(changePoint)}`,
      ),
    );
  }
  return lines.join('\n');
}

/** Compact lines for the chat context: only the solid findings, at most `limit` lines. */
export function renderSolidFindingsForChat(
  report: PatternReport,
  limit: number = CHAT_MAX_FINDING_LINES,
): string | null {
  const lines = report.targets
    .flatMap((target) =>
      target.findings
        .filter((finding) => finding.strength === 'solide')
        .map(
          (finding) =>
            `- ${summarizeFinding(finding, target.label)} [solide, n=${finding.n} jours, ${lagLabel(finding)}]`,
        ),
    )
    .slice(0, limit);
  return lines.length > 0 ? lines.join('\n') : null;
}
