import { jest } from '@jest/globals';
import type { ConfigService } from '@nestjs/config';
import { JevApiError, JevClient } from './jev.client.js';

class FastJevClient extends JevClient {
  protected override delay(): Promise<void> {
    return Promise.resolve();
  }
}

const config = (values: Record<string, string>): ConfigService =>
  ({ get: (key: string) => values[key] }) as unknown as ConfigService;

const ok = (body: object): Response =>
  new Response(JSON.stringify(body), { status: 200 });

describe('JevClient', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('should report itself unconfigured without env vars', () => {
    expect(new JevClient(config({})).isConfigured()).toBe(false);
  });

  it('should call /systemone and parse typed answers', async () => {
    // Arrange
    const fetchMock = jest.fn<typeof fetch>().mockResolvedValue(
      ok({
        model: 'jev-1.14.0',
        answers: {
          a: { type: 'noul', noul: 0.97 },
          b: { type: 'score', score: 2.66, confidence: 0.72 },
        },
      }),
    );
    globalThis.fetch = fetchMock;
    const client = new FastJevClient(
      config({ JEV_API_KEY: 'k', JEV_API_BASE: 'https://x/v1/' }),
    );

    // Act
    const response = await client.analyze('texte', {});

    // Assert
    expect(fetchMock.mock.calls[0][0]).toBe('https://x/v1/systemone');
    expect(response.answers['a']).toEqual({ type: 'noul', noul: 0.97 });
    expect(response.answers['b']).toEqual({
      type: 'score',
      score: 2.66,
      confidence: 0.72,
    });
  });

  it('should retry on 429 then succeed', async () => {
    // Arrange
    const fetchMock = jest
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('', { status: 429 }))
      .mockResolvedValueOnce(ok({ model: 'm', answers: {} }));
    globalThis.fetch = fetchMock;
    const client = new FastJevClient(
      config({ JEV_API_KEY: 'k', JEV_API_BASE: 'https://x' }),
    );

    // Act
    await client.analyze('t', {});

    // Assert
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('should not retry on 400 and should stop after 3 attempts on 529', async () => {
    // Arrange
    const client = new FastJevClient(
      config({ JEV_API_KEY: 'k', JEV_API_BASE: 'https://x' }),
    );
    globalThis.fetch = jest
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('', { status: 400 }));
    const badRequest = globalThis.fetch;

    // Act and Assert
    await expect(client.analyze('t', {})).rejects.toBeInstanceOf(JevApiError);
    expect(badRequest).toHaveBeenCalledTimes(1);

    const overloaded = jest
      .fn<typeof fetch>()
      .mockImplementation(() =>
        Promise.resolve(new Response('', { status: 529 })),
      );
    globalThis.fetch = overloaded;
    await expect(client.analyze('t', {})).rejects.toBeInstanceOf(JevApiError);
    expect(overloaded).toHaveBeenCalledTimes(3);
  });
});
