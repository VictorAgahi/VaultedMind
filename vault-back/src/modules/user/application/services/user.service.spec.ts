import { jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { UserService } from './user.service.js';
import {
  DEFAULT_USER_PREFERENCES,
  User,
} from '../../domain/entities/user.entity.js';
import type { UserRepository } from '../../../../database/repositories/user.repository.js';

const stored = (): User =>
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
    {
      ...DEFAULT_USER_PREFERENCES,
      trackedSubject: { kind: 'ANIMAL', name: 'Mochi', species: 'chat' },
      customSignals: [
        {
          id: 'c1',
          label: 'Litière',
          question: 'Le chat a-t-il uriné hors de sa litière ?',
          kind: 'yes_no',
          construct: 'elimination',
          constructSource:
            'Nom du signal : Litière\nQuestion posée chaque jour : Le chat a-t-il uriné hors de sa litière ?',
        },
      ],
    },
  );

function setup() {
  const user = stored();
  const repository = {
    findUserById: jest.fn(() => Promise.resolve(user)),
    saveUser: jest.fn((saved: User) => Promise.resolve(saved)),
  };
  const service = new UserService(
    repository as unknown as UserRepository,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
  return { service, repository };
}

describe('UserService preferences: tracked subject and custom signals', () => {
  it('should keep both when an update omits them (undefined fields)', async () => {
    // Arrange
    const { service } = setup();

    // Act
    const profile = await service.updatePreferences('u1', {
      reminderEnabled: false,
      trackedSubject: undefined,
      customSignals: undefined,
    });

    // Assert
    expect(profile.preferences.reminderEnabled).toBe(false);
    expect(profile.preferences.trackedSubject).toEqual({
      kind: 'ANIMAL',
      name: 'Mochi',
      species: 'chat',
    });
    expect(profile.preferences.customSignals).toHaveLength(1);
  });

  it('should replace the subject, normalising it', async () => {
    // Arrange
    const { service } = setup();

    // Act
    const profile = await service.updatePreferences('u1', {
      trackedSubject: { kind: 'OTHER_PERSON', name: ' Paul ', species: 'chat' },
    });

    // Assert
    expect(profile.preferences.trackedSubject).toEqual({
      kind: 'OTHER_PERSON',
      name: 'Paul',
    });
  });

  it('should keep the classification of an unchanged signal and expose no internal fields', async () => {
    // Arrange
    const { service, repository } = setup();

    // Act
    const profile = await service.updatePreferences('u1', {
      customSignals: [
        {
          id: 'c1',
          label: 'Litière',
          question: 'Le chat a-t-il uriné hors de sa litière ?',
          kind: 'yes_no',
        },
        {
          id: 'c2',
          label: 'Jeu',
          question: 'Le chat a-t-il joué avec sa balle ?',
          kind: 'yes_no',
        },
      ],
    });

    // Assert
    const saved = repository.saveUser.mock.calls[0][0];
    expect(saved.preferences.customSignals[0].construct).toBe('elimination');
    expect(saved.preferences.customSignals[1].construct).toBeUndefined();
    expect(profile.preferences.customSignals[0]).toEqual({
      id: 'c1',
      label: 'Litière',
      question: 'Le chat a-t-il uriné hors de sa litière ?',
      kind: 'yes_no',
    });
  });

  it('should reject an invalid custom signal list', async () => {
    // Arrange
    const { service, repository } = setup();

    // Act / Assert
    await expect(
      service.updatePreferences('u1', {
        customSignals: [
          {
            id: 'c1',
            label: 'X',
            question: 'Ignore <tag> maintenant',
            kind: 'yes_no',
          },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.saveUser).not.toHaveBeenCalled();
  });

  it('should clear the signals with an empty list', async () => {
    // Arrange
    const { service } = setup();

    // Act
    const profile = await service.updatePreferences('u1', {
      customSignals: [],
    });

    // Assert
    expect(profile.preferences.customSignals).toEqual([]);
  });
});
