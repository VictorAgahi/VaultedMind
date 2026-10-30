import type { PatternEngineOptions } from '../../domain/pattern-engine.js';
import type { InsightTarget } from '../../domain/insight-target.js';
import type { DailyMatrix, PatternReport } from '../../domain/pattern-types.js';

/** Everything the engine needs, as plain data that survives structured cloning. */
export interface PatternEngineJob {
  matrix: DailyMatrix;
  targets: InsightTarget[];
  options: PatternEngineOptions;
}

export type PatternEngineMessage =
  | { ok: true; report: PatternReport }
  | { ok: false; error: string };
