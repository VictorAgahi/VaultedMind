import { TestClient } from './common/test-client.js';
import { v4 as uuidv4 } from 'uuid';

interface FieldBody {
  id: string;
  autofillMode: string;
  name: string;
}

interface ValueBody {
  customFieldId: string;
  value: string;
  source: string | null;
}

interface LogBody {
  id: string;
  fieldValues: ValueBody[];
}

interface DraftBody {
  proposals: unknown[];
  skippedFieldIds: string[];
}

const registerAndLogin = async (client: TestClient): Promise<void> => {
  const email = `voice-${uuidv4()}@example.com`;
  const password = 'Password123!';
  await client
    .post('/auth/register', { email, password, healthDataConsent: true })
    .expect(201);
  const login = await client
    .post('/auth/login', { email, password })
    .expect(200);
  client.setAuthCookie(login.header['set-cookie'][0]);
};

const audio = Buffer.from('not really audio');

describe('Voice entry and factual autofill (e2e)', () => {
  let noConsent: TestClient;
  let consented: TestClient;
  let emptyAccount: TestClient;
  let anonymous: TestClient;

  beforeAll(async (): Promise<void> => {
    noConsent = await TestClient.create();
    consented = await TestClient.create();
    await registerAndLogin(noConsent);
    emptyAccount = await TestClient.create();
    anonymous = await TestClient.create();
    await registerAndLogin(noConsent);
    await registerAndLogin(consented);
    await registerAndLogin(emptyAccount);
    for (const client of [consented, emptyAccount]) {
      await client
        .post('/health/ai-insights/enable', {
          consent: true,
          includeNotes: true,
        })
        .expect(201);
    }
  });

  afterAll(async (): Promise<void> => {
    await Promise.all([
      noConsent.close(),
      consented.close(),
      emptyAccount.close(),
      anonymous.close(),
    ]);
  });

  describe('custom field autofillMode', () => {
    it('should default to AUTO and accept ON or OFF at creation', async (): Promise<void> => {
      // Act
      const byDefault = await consented
        .post('/health/custom-fields', { name: 'Sommeil', fieldType: 'NUMBER' })
        .expect(201);
      const explicit = await consented
        .post('/health/custom-fields', {
          name: 'Cafés',
          fieldType: 'NUMBER',
          autofillMode: 'ON',
        })
        .expect(201);

      // Assert
      expect((byDefault.body as FieldBody).autofillMode).toBe('AUTO');
      expect((explicit.body as FieldBody).autofillMode).toBe('ON');
    });

    it('should update the mode and keep it when an update omits it', async (): Promise<void> => {
      // Arrange
      const created = await consented
        .post('/health/custom-fields', { name: 'Sport', fieldType: 'NUMBER' })
        .expect(201);
      const id = (created.body as FieldBody).id;

      // Act
      const off = await consented
        .patch(`/health/custom-fields/${id}`, { autofillMode: 'OFF' })
        .expect(200);
      const renamed = await consented
        .patch(`/health/custom-fields/${id}`, { name: 'Sport (min)' })
        .expect(200);

      // Assert
      expect((off.body as FieldBody).autofillMode).toBe('OFF');
      expect((renamed.body as FieldBody).autofillMode).toBe('OFF');
    });

    it('should reject an unknown mode on create and update', async (): Promise<void> => {
      // Arrange
      const created = await consented
        .post('/health/custom-fields', { name: 'Écrans', fieldType: 'NUMBER' })
        .expect(201);
      const id = (created.body as FieldBody).id;

      // Act / Assert
      await consented
        .post('/health/custom-fields', {
          name: 'X',
          fieldType: 'NUMBER',
          autofillMode: 'MAYBE',
        })
        .expect(400);
      await consented
        .patch(`/health/custom-fields/${id}`, { autofillMode: 'null' })
        .expect(400);
    });
  });

  describe('POST /health/daily-logs/autofill-draft', () => {
    it('should answer 403 without AI consent', async (): Promise<void> => {
      // Act
      const res = await noConsent
        .post('/health/daily-logs/autofill-draft', {
          text: "J'ai dormi six heures",
          logDate: '2026-10-31',
        })
        .expect(403);

      // Assert
      expect((res.body as { code: string }).code).toBe('AI_CONSENT_REQUIRED');
    });

    it('should answer 400 on invalid payloads', async (): Promise<void> => {
      // Act / Assert
      const invalid = [
        { logDate: '2026-10-31' },
        { text: '', logDate: '2026-10-31' },
        { text: '   ', logDate: '2026-10-31' },
        { text: 'x'.repeat(20001), logDate: '2026-10-31' },
        { text: 'bonjour', logDate: 'demain' },
        { text: 'bonjour' },
      ];
      for (const body of invalid) {
        await consented
          .post('/health/daily-logs/autofill-draft', body)
          .expect(400);
      }
    });

    it('should answer without calling the model when no field is eligible', async (): Promise<void> => {
      // Arrange
      const off = await emptyAccount
        .post('/health/custom-fields', {
          name: 'Sommeil',
          fieldType: 'NUMBER',
          autofillMode: 'OFF',
        })
        .expect(201);

      // Act
      const res = await emptyAccount
        .post('/health/daily-logs/autofill-draft', {
          text: "J'ai dormi six heures",
          logDate: '2026-10-31',
        })
        .expect(201);

      // Assert
      expect(res.body as DraftBody).toEqual({
        proposals: [],
        skippedFieldIds: [(off.body as FieldBody).id],
      });
    });
  });

  describe('POST /health/daily-logs/voice-transcription', () => {
    it('should answer 403 without AI consent', async (): Promise<void> => {
      // Act
      const res = await noConsent
        .postFile(
          '/health/daily-logs/voice-transcription',
          'audio',
          audio,
          'recording.m4a',
          'audio/mp4',
        )
        .expect(403);

      // Assert
      expect((res.body as { code: string }).code).toBe('AI_CONSENT_REQUIRED');
    });

    it('should answer 400 without a file', async (): Promise<void> => {
      // Act / Assert
      await consented
        .post('/health/daily-logs/voice-transcription')
        .expect(400);
    });

    it('should answer 415 for an unsupported format', async (): Promise<void> => {
      // Act / Assert
      await consented
        .postFile(
          '/health/daily-logs/voice-transcription',
          'audio',
          audio,
          'movie.mp4',
          'video/mp4',
        )
        .expect(415);
    });

    it('should answer 413 above 10 MB', async (): Promise<void> => {
      // Act / Assert
      await consented
        .postFile(
          '/health/daily-logs/voice-transcription',
          'audio',
          Buffer.alloc(10 * 1024 * 1024 + 1),
          'long.m4a',
          'audio/mp4',
        )
        .expect(413);
    });

    it('should require authentication', async (): Promise<void> => {
      // Act / Assert
      await anonymous
        .postFile(
          '/health/daily-logs/voice-transcription',
          'audio',
          audio,
          'recording.m4a',
          'audio/mp4',
        )
        .expect(401);
    });
  });

  describe('POST /health/daily-logs/entry source', () => {
    it('should round trip the agent source and reset it on a manual save', async (): Promise<void> => {
      // Arrange
      const field = await consented
        .post('/health/custom-fields', { name: 'Marche', fieldType: 'NUMBER' })
        .expect(201);
      const customFieldId = (field.body as FieldBody).id;

      // Act
      const withAgent = await consented
        .post('/health/daily-logs/entry', {
          logDate: '2026-10-30',
          values: [{ customFieldId, value: '6.5', source: 'agent' }],
        })
        .expect(201);
      const listed = await consented.get('/health/daily-logs').expect(200);
      const reloaded = (listed.body as LogBody[]).find(
        (log) => log.id === (withAgent.body as LogBody).id,
      );
      const edited = await consented
        .post('/health/daily-logs/entry', {
          logDate: '2026-10-30',
          values: [{ customFieldId, value: '7' }],
        })
        .expect(201);

      // Assert
      expect((withAgent.body as LogBody).fieldValues[0].source).toBe('agent');
      expect(reloaded?.fieldValues[0].source).toBe('agent');
      expect((edited.body as LogBody).fieldValues[0]).toMatchObject({
        value: '7',
        source: null,
      });
    });

    it('should reject any source other than agent', async (): Promise<void> => {
      // Arrange
      const field = await consented
        .post('/health/custom-fields', { name: 'Eau', fieldType: 'NUMBER' })
        .expect(201);
      const customFieldId = (field.body as FieldBody).id;

      // Act / Assert
      for (const source of ['manual', 'AGENT', 'user', 7]) {
        await consented
          .post('/health/daily-logs/entry', {
            logDate: '2026-10-29',
            values: [{ customFieldId, value: '2', source }],
          })
          .expect(400);
      }
    });
  });
});
