import { jest } from '@jest/globals';
import { AutofillFieldsService } from './autofill-fields.service.js';
import {
  DEFAULT_USER_PREFERENCES,
  User,
} from '../../../user/domain/entities/user.entity.js';
import type { UserPreferences } from '../../../user/domain/entities/user.entity.js';
import { CustomField } from '../../domain/entities/custom-field.entity.js';
import type { AutofillMode } from '../../domain/entities/custom-field.entity.js';
import { FieldType } from '../../domain/enums/field-type.enum.js';
import type { UserRepository } from '../../../../database/repositories/user.repository.js';
import type { CustomFieldRepository } from '../../../../database/repositories/custom-field.repository.js';

const buildUser = (preferences: Partial<UserPreferences> = {}): User =>
  new User(
    'user-1',
    'u@test.com',
    'hash',
    new Date(),
    new Date(),
    true,
    undefined,
    false,
    undefined,
    { ...DEFAULT_USER_PREFERENCES, ...preferences },
    {},
  );

const buildField = (
  id: string,
  name: string,
  construct: string,
  overrides: Partial<{ autofillMode: AutofillMode; isActive: boolean }> = {},
): CustomField =>
  new CustomField(
    id,
    'user-1',
    name,
    FieldType.NUMBER,
    overrides.isActive ?? true,
    new Date(),
    new Date(),
    undefined,
    undefined,
    false,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    construct,
    undefined,
    undefined,
    overrides.autofillMode ?? 'AUTO',
  );

describe('AutofillFieldsService.listEligible', () => {
  const build = (fields: CustomField[], user: User): AutofillFieldsService => {
    const userRepository = {
      findUserById: jest.fn<() => Promise<User>>().mockResolvedValue(user),
    } as unknown as UserRepository;
    const fieldRepository = {
      findByUserId: jest
        .fn<() => Promise<CustomField[]>>()
        .mockResolvedValue(fields),
    } as unknown as CustomFieldRepository;
    return new AutofillFieldsService(userRepository, fieldRepository);
  };

  it('should list factual AUTO fields and ON fields only, with id and name', async () => {
    // Arrange
    const service = build(
      [
        buildField('sleep', 'Sommeil', 'sleep'),
        buildField('mood', 'Humeur', 'mood'),
        buildField('anxiety', 'Anxiété', 'mood', { autofillMode: 'ON' }),
        buildField('coffee', 'Cafés', 'substances', { autofillMode: 'OFF' }),
        buildField('old', 'Ancien', 'sleep', { isActive: false }),
      ],
      buildUser(),
    );

    // Act
    const result = await service.listEligible('user-1');

    // Assert
    expect(result).toEqual([
      { id: 'sleep', name: 'Sommeil' },
      { id: 'anxiety', name: 'Anxiété' },
    ]);
  });

  it('should exclude insight targets', async () => {
    // Arrange
    const service = build(
      [buildField('sleep', 'Sommeil', 'sleep')],
      buildUser({
        insightTargets: [
          { fieldId: 'sleep' },
        ] as UserPreferences['insightTargets'],
      }),
    );

    // Act
    const result = await service.listEligible('user-1');

    // Assert
    expect(result).toEqual([]);
  });
});
