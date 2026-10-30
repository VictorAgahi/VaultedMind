import { existsSync } from 'node:fs';
import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';
import { Injectable, Logger } from '@nestjs/common';
import { computePatternReport } from '../../domain/pattern-engine.js';
import type { PatternReport } from '../../domain/pattern-types.js';
import type {
  PatternEngineJob,
  PatternEngineMessage,
} from './pattern-engine-job.js';

/**
 * Runs the (CPU heavy, synchronous) engine in a worker thread so that a recompute never blocks
 * the event loop. The worker file is a sibling of this one in the Nest build output and is
 * resolved from import.meta.url. When it cannot start (for instance under ts-jest, where only
 * TypeScript sources exist), the engine runs in-process and a warning is logged.
 */
@Injectable()
export class PatternEngineRunner {
  private readonly logger = new Logger(PatternEngineRunner.name);

  async run(job: PatternEngineJob): Promise<PatternReport> {
    try {
      return await this.runInWorker(job);
    } catch (error) {
      this.logger.warn(
        `Pattern worker unavailable, computing in-process: ${error instanceof Error ? error.message : String(error)}`,
      );
      return computePatternReport(job.matrix, job.targets, job.options);
    }
  }

  protected workerUrl(): URL {
    return new URL('./pattern-engine.worker.js', import.meta.url);
  }

  private runInWorker(job: PatternEngineJob): Promise<PatternReport> {
    const url = this.workerUrl();
    if (!existsSync(fileURLToPath(url))) {
      return Promise.reject(new Error('worker file not found'));
    }
    return new Promise<PatternReport>((resolve, reject) => {
      const worker = new Worker(url, { workerData: job });
      let settled = false;
      const finish = (action: () => void): void => {
        if (settled) return;
        settled = true;
        action();
        void worker.terminate();
      };
      worker.once('message', (message: PatternEngineMessage) => {
        finish(() =>
          message.ok
            ? resolve(message.report)
            : reject(new Error(message.error)),
        );
      });
      worker.once('error', (error) => finish(() => reject(error)));
      worker.once('exit', (code) =>
        finish(() => reject(new Error(`worker exited with code ${code}`))),
      );
    });
  }
}
