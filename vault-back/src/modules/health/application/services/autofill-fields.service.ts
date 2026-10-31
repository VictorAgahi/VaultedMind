import { Injectable } from '@nestjs/common';
import { UserRepository } from '../../../../database/repositories/user.repository.js';
import { CustomFieldRepository } from '../../../../database/repositories/custom-field.repository.js';
import {
  buildAutofillContext,
  isAutofillEligible,
} from '../../domain/services/autofill-eligibility.js';
import type { AutofillFieldDto } from '../dtos/autofill-fields.dto.js';

/** Tells the user which of their fields the story of the day may pre-fill. */
@Injectable()
export class AutofillFieldsService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly customFieldRepository: CustomFieldRepository,
  ) {}

  async listEligible(userId: string): Promise<AutofillFieldDto[]> {
    const user = await this.userRepository.findUserById(userId);
    const context = buildAutofillContext(user.preferences);
    const fields = await this.customFieldRepository.findByUserId(userId);
    return fields
      .filter((field) => isAutofillEligible(field, context))
      .map((field) => ({ id: field.id, name: field.name }));
  }
}
