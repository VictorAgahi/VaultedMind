import { parentPort, workerData } from 'node:worker_threads';
import { computePatternReport } from '../../domain/pattern-engine.js';
import type {
  PatternEngineJob,
  PatternEngineMessage,
} from './pattern-engine-job.js';

function run(job: PatternEngineJob): PatternEngineMessage {
  try {
    return {
      ok: true,
      report: computePatternReport(job.matrix, job.targets, job.options),
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

if (parentPort) {
  parentPort.postMessage(run(workerData as PatternEngineJob));
}
