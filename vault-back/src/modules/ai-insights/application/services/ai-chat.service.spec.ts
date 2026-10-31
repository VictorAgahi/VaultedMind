import { jest } from '@jest/globals';
import { AIChatService } from './ai-chat.service.js';
import {
  DEFAULT_USER_PREFERENCES,
  User,
} from '../../../user/domain/entities/user.entity.js';
import type { TrackedSubject } from '../../../signals/domain/tracked-subject.js';

const buildUser = (subject: TrackedSubject): User =>
  new User(
    'u1',
    'u1@t.com',
    'h',
    new Date(),
    new Date(),
    true,
    undefined,
    false,
    undefined,
    { ...DEFAULT_USER_PREFERENCES, trackedSubject: subject },
    { aiConsentAt: new Date() },
  );

function setup(subject: TrackedSubject, message = 'Pourquoi griffe-t-il ?') {
  const generate = jest
    .fn<(prompt: string) => Promise<string>>()
    .mockResolvedValue('Réponse');
  const service = new AIChatService(
    {
      findByUserId: jest.fn(() => Promise.resolve([])),
    } as never,
    { findByUserId: jest.fn(() => Promise.resolve([])) } as never,
    {
      findUserById: jest.fn(() => Promise.resolve(buildUser(subject))),
    } as never,
    {
      tryReserve: jest.fn(() =>
        Promise.resolve({
          status: {
            remaining: 5,
            nextAvailableAt: null,
            cooldownRemainingMs: 0,
            maxAllowed: 10,
          },
          usageId: 'use1',
        }),
      ),
      getUsageStatus: jest.fn(() =>
        Promise.resolve({ remaining: 5, nextAvailableAt: null }),
      ),
      release: jest.fn(),
    } as never,
    { findByUserId: jest.fn(() => Promise.resolve(null)) } as never,
    { sanitizeLogsForAI: jest.fn() } as never,
    {
      generateTextWithConfig: generate,
      getChatModel: jest.fn(() => 'model'),
    } as never,
  );
  return { service, generate, message };
}

describe('AIChatService tracked subject', () => {
  it('should state the tracked animal and the vet advice in the system prompt', async () => {
    // Arrange
    const { service, generate, message } = setup({
      kind: 'ANIMAL',
      name: 'Mochi',
      species: 'chat',
    });

    // Act
    await service.getChatResponse('u1', message);

    // Assert
    const prompt = generate.mock.calls[0][0];
    expect(prompt).toContain('SUJET DU SUIVI : UN ANIMAL');
    expect(prompt).toContain('Mochi (le chat)');
    expect(prompt).toContain('vétérinaire');
  });

  it('should not add a subject statement for the user own journal', async () => {
    // Arrange
    const { service, generate, message } = setup({ kind: 'SELF' });

    // Act
    await service.getChatResponse('u1', message);

    // Assert
    expect(generate.mock.calls[0][0]).not.toContain('SUJET DU SUIVI');
  });

  it('should still return the crisis resources for the author own words', async () => {
    // Arrange
    const { service, generate } = setup(
      { kind: 'ANIMAL', name: 'Mochi' },
      'je veux mourir',
    );

    // Act
    const reply = await service.getChatResponse('u1', 'je veux mourir');

    // Assert
    expect(reply.safety).toBe(true);
    expect(generate).not.toHaveBeenCalled();
  });
});
