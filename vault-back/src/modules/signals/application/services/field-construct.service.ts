import { Injectable, Logger } from '@nestjs/common';
import { EncryptionService } from '../../../../common/security/encryption.service.js';
import { mapWithConcurrency } from '../../../../common/utils/map-with-concurrency.js';
import { CustomFieldRepository } from '../../../../database/repositories/custom-field.repository.js';
import type { CustomField } from '../../../health/domain/entities/custom-field.entity.js';
import { FieldType } from '../../../health/domain/enums/field-type.enum.js';
import {
  FIELD_CONSTRUCT_HASH_PURPOSE,
  FIELD_CONSTRUCT_QUESTION_KEY,
  buildFieldConstructQuestion,
  describeFieldForClassification,
  parseConstructAnswer,
} from '../../domain/field-construct.js';
import { JevClient } from '../../infrastructure/clients/jev.client.js';

export const FIELD_CONSTRUCT_CONCURRENCY = 4;

const CLASSIFIED_TYPES: FieldType[] = [
  FieldType.NUMBER,
  FieldType.BOOLEAN,
  FieldType.STRING,
];

/**
 * Classifies what each custom field measures (sleep, mood, ...) with one Jev choice question
 * per field. A keyed hash of the name, category and options the answer was computed from is
 * stored with it, so that a rename or an option change triggers a new classification.
 * Only the field description is sent, never any value or note.
 */
@Injectable()
export class FieldConstructService {
  private readonly logger = new Logger(FieldConstructService.name);

  constructor(
    private readonly customFieldRepository: CustomFieldRepository,
    private readonly encryptionService: EncryptionService,
    private readonly jevClient: JevClient,
  ) {}

  hashOf(field: CustomField): string {
    return this.encryptionService.createKeyedHash(
      describeFieldForClassification(field),
      FIELD_CONSTRUCT_HASH_PURPOSE,
    );
  }

  /** Fields that have never been classified, or whose description changed since. */
  findFieldsToClassify(fields: CustomField[]): CustomField[] {
    return fields.filter(
      (field) =>
        field.isActive &&
        !field.appleWatchMetric &&
        CLASSIFIED_TYPES.includes(field.fieldType) &&
        field.constructNameHash !== this.hashOf(field),
    );
  }

  /** Returns the number of fields classified (0 when Jev is not configured or all are up to date). */
  async classifyFields(fields: CustomField[]): Promise<number> {
    const pending = this.findFieldsToClassify(fields);
    if (pending.length === 0 || !this.jevClient.isConfigured()) return 0;

    const results = await mapWithConcurrency(
      pending,
      FIELD_CONSTRUCT_CONCURRENCY,
      (field) => this.classifyOne(field),
    );
    return results.filter(Boolean).length;
  }

  private async classifyOne(field: CustomField): Promise<boolean> {
    try {
      const response = await this.jevClient.analyze(
        describeFieldForClassification(field),
        { [FIELD_CONSTRUCT_QUESTION_KEY]: buildFieldConstructQuestion() },
      );
      const construct = parseConstructAnswer(
        response.answers[FIELD_CONSTRUCT_QUESTION_KEY],
      );
      await this.customFieldRepository.saveConstruct(
        field.id,
        construct,
        this.hashOf(field),
      );
      return true;
    } catch (error) {
      this.logger.warn(
        `Construct classification failed for field ${field.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }
}
