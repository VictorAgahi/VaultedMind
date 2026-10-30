import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/infrastructure/auth.module.js';
import { SignalsModule } from '../../signals/infrastructure/signals.module.js';
import { PatternsService } from '../application/services/patterns.service.js';
import { ObviousnessService } from '../application/services/obviousness.service.js';
import { PatternEngineRunner } from './workers/pattern-engine.runner.js';
import { PatternsCronService } from './cron/patterns-cron.service.js';
import { PatternsController } from './controllers/patterns.controller.js';

@Module({
  imports: [AuthModule, SignalsModule],
  providers: [
    PatternsService,
    PatternsCronService,
    ObviousnessService,
    PatternEngineRunner,
  ],
  controllers: [PatternsController],
  exports: [PatternsService],
})
export class PatternsModule {}
