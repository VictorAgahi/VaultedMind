import { Injectable, Logger } from '@nestjs/common';
import { mapWithConcurrency } from '../../../../common/utils/map-with-concurrency.js';
import { JevClient } from '../../../signals/infrastructure/clients/jev.client.js';
import {
  MAX_OBVIOUSNESS_REQUESTS,
  OBVIOUSNESS_QUESTION_KEY,
  buildFindingKey,
  buildObviousnessQuestion,
  collectKnownObviousness,
  describeLink,
  parseObviousnessAnswer,
} from '../../domain/pattern-obviousness.js';
import type {
  LinkObviousness,
  PatternFinding,
  PatternReport,
  TargetReport,
} from '../../domain/pattern-types.js';

export const OBVIOUSNESS_CONCURRENCY = 4;

interface PendingFinding {
  target: TargetReport;
  finding: PatternFinding;
}

/**
 * Asks Jev how obvious each finding is, one score request per finding. Scores are reused from
 * the previous report for the same finding key. Never fails the report: without Jev, or on any
 * error, a finding simply has no score and is treated as not obvious. The statements contain
 * field names and are never logged.
 */
@Injectable()
export class ObviousnessService {
  private readonly logger = new Logger(ObviousnessService.name);

  constructor(private readonly jevClient: JevClient) {}

  async annotate(
    report: PatternReport,
    previous: PatternReport | null,
  ): Promise<PatternReport> {
    const known = collectKnownObviousness(previous);
    const pending: PendingFinding[] = [];
    const annotated = report.targets.map((target) => ({
      ...target,
      findings: target.findings.map((finding): PatternFinding => {
        const reused = known.get(buildFindingKey(target.key, finding));
        if (reused) return { ...finding, obviousness: reused };
        const withoutScore: PatternFinding = { ...finding, obviousness: null };
        pending.push({ target, finding: withoutScore });
        return withoutScore;
      }),
    }));

    if (pending.length > 0 && this.jevClient.isConfigured()) {
      await this.askJev(pending.slice(0, MAX_OBVIOUSNESS_REQUESTS));
    }
    return { ...report, targets: annotated };
  }

  private async askJev(pending: PendingFinding[]): Promise<void> {
    const question = buildObviousnessQuestion();
    let failures = 0;
    await mapWithConcurrency(
      pending,
      OBVIOUSNESS_CONCURRENCY,
      async ({ target, finding }) => {
        try {
          const response = await this.jevClient.analyze(
            describeLink(finding, target),
            { [OBVIOUSNESS_QUESTION_KEY]: question },
          );
          const parsed: LinkObviousness | null = parseObviousnessAnswer(
            response.answers[OBVIOUSNESS_QUESTION_KEY],
          );
          finding.obviousness = parsed;
        } catch {
          failures++;
        }
      },
    );
    if (failures > 0) {
      this.logger.warn(
        `Obviousness scoring failed for ${failures} of ${pending.length} findings`,
      );
    }
  }
}
