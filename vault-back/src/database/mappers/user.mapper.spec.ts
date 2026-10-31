import { ConfigService } from '@nestjs/config';
import { EncryptionService } from '../../common/security/encryption.service.js';
import {
  DEFAULT_USER_PREFERENCES,
  User,
} from '../../modules/user/domain/entities/user.entity.js';
import { UserMapper } from './user.mapper.js';

const mapper = new UserMapper(
  new EncryptionService({
    getOrThrow: () => '0123456789abcdef0123456789abcdef',
  } as unknown as ConfigService),
);

const userWith = (
  preferences: Partial<typeof DEFAULT_USER_PREFERENCES>,
): User =>
  new User(
    'u1',
    'u1@t.com',
    'h',
    new Date(),
    new Date(),
    false,
    undefined,
    false,
    undefined,
    { ...DEFAULT_USER_PREFERENCES, ...preferences },
  );

describe('UserMapper tracked subject and custom signals', () => {
  it('should store both encrypted and read them back', () => {
    // Arrange
    const user = userWith({
      trackedSubject: { kind: 'ANIMAL', name: 'Mochi', species: 'chat' },
      customSignals: [
        {
          id: 'c1',
          label: 'Litière',
          question: 'Le chat a-t-il uriné hors de sa litière ?',
          kind: 'yes_no',
          construct: 'elimination',
          constructSource: 'src',
        },
      ],
    });

    // Act
    const model = mapper.toPersistence(user);
    const back = mapper.toDomain(model);

    // Assert
    expect(model.trackedSubjectEncrypted).not.toContain('Mochi');
    expect(model.customSignalsEncrypted).not.toContain('Litière');
    expect(back.preferences.trackedSubject).toEqual(
      user.preferences.trackedSubject,
    );
    expect(back.preferences.customSignals).toEqual(
      user.preferences.customSignals,
    );
  });

  it('should default to SELF and no signals when nothing is stored', () => {
    // Act
    const model = mapper.toPersistence(userWith({}));
    const back = mapper.toDomain(model);

    // Assert
    expect(model.trackedSubjectEncrypted).toBeNull();
    expect(model.customSignalsEncrypted).toBeNull();
    expect(back.preferences.trackedSubject).toEqual({ kind: 'SELF' });
    expect(back.preferences.customSignals).toEqual([]);
  });
});
