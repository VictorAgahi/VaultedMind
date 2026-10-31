import { jest } from '@jest/globals';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { SyncTokenOrApiKeyGuard } from './sync-token-or-api-key.guard.js';

interface FakeRequest {
  headers: Record<string, string | undefined>;
  user?: { id: string };
}

function contextFor(request: FakeRequest): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('SyncTokenOrApiKeyGuard', () => {
  let tokens: { consume: jest.Mock<(token: string) => Promise<string | null>> };
  let apiKeyGuard: {
    canActivate: jest.Mock<(context: ExecutionContext) => Promise<boolean>>;
  };
  let guard: SyncTokenOrApiKeyGuard;

  beforeEach(() => {
    tokens = {
      consume: jest.fn<(token: string) => Promise<string | null>>(),
    };
    apiKeyGuard = {
      canActivate: jest
        .fn<(context: ExecutionContext) => Promise<boolean>>()
        .mockResolvedValue(true),
    };
    guard = new SyncTokenOrApiKeyGuard(tokens as never, apiKeyGuard as never);
  });

  it('should authenticate with a valid sync token', async () => {
    // Arrange
    tokens.consume.mockResolvedValue('user-1');
    const request: FakeRequest = { headers: { 'x-sync-token': 'abc' } };

    // Act
    const allowed = await guard.canActivate(contextFor(request));

    // Assert
    expect(allowed).toBe(true);
    expect(request.user).toEqual({ id: 'user-1' });
    expect(apiKeyGuard.canActivate).not.toHaveBeenCalled();
  });

  it('should reject an invalid, expired or used sync token', async () => {
    // Arrange
    tokens.consume.mockResolvedValue(null);

    // Act
    const attempt = guard.canActivate(
      contextFor({ headers: { 'x-sync-token': 'abc' } }),
    );

    // Assert
    await expect(attempt).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('should reject an empty sync token without falling back to the API key', async () => {
    // Act
    const attempt = guard.canActivate(
      contextFor({ headers: { 'x-sync-token': '  ' } }),
    );

    // Assert
    await expect(attempt).rejects.toBeInstanceOf(UnauthorizedException);
    expect(apiKeyGuard.canActivate).not.toHaveBeenCalled();
  });

  it('should delegate to the API key guard when there is no sync token', async () => {
    // Arrange
    const context = contextFor({ headers: { 'x-api-key': 'vm_x' } });

    // Act
    const allowed = await guard.canActivate(context);

    // Assert
    expect(allowed).toBe(true);
    expect(apiKeyGuard.canActivate).toHaveBeenCalledWith(context);
  });
});
