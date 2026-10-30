import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/infrastructure/auth.module.js';
import { JevClient } from './clients/jev.client.js';
import { JournalSignalsService } from '../application/services/journal-signals.service.js';
import { FieldConstructService } from '../application/services/field-construct.service.js';
import { SignalsReadService } from '../application/services/signals-read.service.js';
import { JournalSignalsCronService } from './cron/journal-signals-cron.service.js';
import { SignalsController } from './controllers/signals.controller.js';

@Module({
  imports: [AuthModule],
  providers: [
    JevClient,
    JournalSignalsService,
    JournalSignalsCronService,
    SignalsReadService,
    FieldConstructService,
  ],
  controllers: [SignalsController],
  exports: [SignalsReadService, FieldConstructService, JevClient],
})
export class SignalsModule {}
