import { TestClient } from './common/test-client.js';
import { v4 as uuidv4 } from 'uuid';
import { DataSource } from 'typeorm';

interface LogBody {
  id: string;
  notes?: string;
}

interface FieldsBody {
  fields: Array<{ id: string; name: string }>;
}

const registerAndLogin = async (client: TestClient): Promise<void> => {
  const email = `append-${uuidv4()}@example.com`;
  const password = 'Password123!';
  await client
    .post('/auth/register', { email, password, healthDataConsent: true })
    .expect(201);
  const login = await client
    .post('/auth/login', { email, password })
    .expect(200);
  client.setAuthCookie(login.header['set-cookie'][0]);
};

async function readStoredNotes(logId: string): Promise<string> {
  const db = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  await db.initialize();
  try {
    const rows: Array<{ notes: string }> = await db.query(
      'SELECT notes FROM daily_logs WHERE id = $1',
      [logId],
    );
    return rows[0].notes;
  } finally {
    await db.destroy();
  }
}

describe('Daily notes append and autofill fields (e2e)', () => {
  let owner: TestClient;
  let other: TestClient;
  let anonymous: TestClient;

  beforeAll(async (): Promise<void> => {
    owner = await TestClient.create();
    other = await TestClient.create();
    anonymous = await TestClient.create();
    await registerAndLogin(owner);
    await registerAndLogin(other);
  });

  afterAll(async (): Promise<void> => {
    await Promise.all([owner.close(), other.close(), anonymous.close()]);
  });

  describe('POST /health/daily-logs/notes/append', () => {
    it('should create the log, then append with a blank line, encrypted at rest', async (): Promise<void> => {
      // Act
      const first = await owner
        .post('/health/daily-logs/notes/append', {
          logDate: '2026-10-31',
          text: 'Première dictée',
        })
        .expect(201);
      const second = await owner
        .post('/health/daily-logs/notes/append', {
          logDate: '2026-10-31',
          text: 'Seconde dictée',
        })
        .expect(201);

      // Assert
      const firstBody = first.body as LogBody;
      const secondBody = second.body as LogBody;
      expect(firstBody.notes).toBe('Première dictée');
      expect(secondBody.id).toBe(firstBody.id);
      expect(secondBody.notes).toBe('Première dictée\n\nSeconde dictée');
      const stored = await readStoredNotes(firstBody.id);
      expect(stored).not.toContain('dictée');
      const listed = await owner.get('/health/daily-logs').expect(200);
      const reloaded = (listed.body as LogBody[]).filter(
        (log) => log.id === firstBody.id,
      );
      expect(reloaded).toHaveLength(1);
      expect(reloaded[0].notes).toBe('Première dictée\n\nSeconde dictée');
    });

    it('should append to the notes written by a normal save', async (): Promise<void> => {
      // Arrange
      const saved = await owner
        .post('/health/daily-logs/entry', {
          logDate: '2026-10-30',
          notes: 'Écrit à la main',
          values: [],
        })
        .expect(201);

      // Act
      const res = await owner
        .post('/health/daily-logs/notes/append', {
          logDate: '2026-10-30',
          text: 'Dicté',
        })
        .expect(201);

      // Assert
      expect((res.body as LogBody).id).toBe((saved.body as LogBody).id);
      expect((res.body as LogBody).notes).toBe('Écrit à la main\n\nDicté');
    });

    it('should never touch the log of another user', async (): Promise<void> => {
      // Arrange
      const mine = await owner
        .post('/health/daily-logs/notes/append', {
          logDate: '2026-10-29',
          text: 'Privé',
        })
        .expect(201);

      // Act
      const theirs = await other
        .post('/health/daily-logs/notes/append', {
          logDate: '2026-10-29',
          text: 'Autre personne',
        })
        .expect(201);

      // Assert
      expect((theirs.body as LogBody).id).not.toBe((mine.body as LogBody).id);
      expect((theirs.body as LogBody).notes).toBe('Autre personne');
      const reread = await owner.get('/health/daily-logs').expect(200);
      const ownLog = (reread.body as LogBody[]).find(
        (log) => log.id === (mine.body as LogBody).id,
      );
      expect(ownLog?.notes).toBe('Privé');
    });

    it('should answer 400 on invalid payloads', async (): Promise<void> => {
      // Act / Assert
      const invalid = [
        { logDate: '2026-10-31' },
        { text: 'bonjour' },
        { logDate: '2026-10-31', text: '' },
        { logDate: '2026-10-31', text: '   ' },
        { logDate: '2026-10-31', text: 'x'.repeat(20001) },
        { logDate: 'demain', text: 'bonjour' },
      ];
      for (const body of invalid) {
        await owner.post('/health/daily-logs/notes/append', body).expect(400);
      }
    });

    it('should require authentication', async (): Promise<void> => {
      // Act / Assert
      await anonymous
        .post('/health/daily-logs/notes/append', {
          logDate: '2026-10-31',
          text: 'bonjour',
        })
        .expect(401);
    });
  });

  describe('GET /health/daily-logs/autofill-fields', () => {
    it('should list exactly the eligible fields', async (): Promise<void> => {
      // Arrange
      const forced = await owner
        .post('/health/custom-fields', {
          name: 'Humeur',
          fieldType: 'NUMBER',
          autofillMode: 'ON',
        })
        .expect(201);
      await owner
        .post('/health/custom-fields', {
          name: 'Cafés',
          fieldType: 'NUMBER',
          autofillMode: 'OFF',
        })
        .expect(201);

      // Act
      const res = await owner
        .get('/health/daily-logs/autofill-fields')
        .expect(200);

      // Assert
      const ids = (res.body as FieldsBody).fields.map((field) => field.id);
      expect(ids).toContain((forced.body as { id: string }).id);
      expect((res.body as FieldsBody).fields).toContainEqual({
        id: (forced.body as { id: string }).id,
        name: 'Humeur',
      });
      expect(
        (res.body as FieldsBody).fields.find((f) => f.name === 'Cafés'),
      ).toBeUndefined();
    });

    it('should answer an empty list for an account without fields', async (): Promise<void> => {
      // Act
      const res = await other
        .get('/health/daily-logs/autofill-fields')
        .expect(200);

      // Assert
      expect(res.body as FieldsBody).toEqual({ fields: [] });
    });

    it('should require authentication', async (): Promise<void> => {
      // Act / Assert
      await anonymous.get('/health/daily-logs/autofill-fields').expect(401);
    });
  });
});
