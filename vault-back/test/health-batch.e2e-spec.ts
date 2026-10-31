import { TestClient } from './common/test-client.js';
import { v4 as uuidv4 } from 'uuid';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppleWatchMetric } from '../src/modules/health/domain/enums/apple-watch-metric.enum.js';

interface StoredResult {
  success: boolean;
  stored: Array<{ metric: string; value: number }>;
  createdFields: string[];
  ignoredSleepLabels: string[];
}

interface LogView {
  fieldValues?: Array<{ customFieldId: string; value: string }>;
}

interface FieldView {
  id: string;
  name: string;
  category?: string;
  appleWatchMetric?: string;
  optionsOrder?: string[];
}

async function registerAndLogin(client: TestClient): Promise<string> {
  const email = `batch-${uuidv4()}@example.com`;
  const password = 'Password123!';
  await client
    .post('/auth/register', { email, password, healthDataConsent: true })
    .expect(201);
  const res = await client.post('/auth/login', { email, password }).expect(200);
  return (res.header['set-cookie'] as unknown as string[])[0];
}

async function withDatabase<T>(
  work: (db: DataSource) => Promise<T>,
): Promise<T> {
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
    return await work(db);
  } finally {
    await db.destroy();
  }
}

const NIGHT = [
  {
    value: 'InBed',
    start: '2026-01-14T22:45:00+01:00',
    end: '2026-01-15T07:00:00+01:00',
  },
  {
    value: 'Core',
    start: '2026-01-14T23:30:00+01:00',
    end: '2026-01-15T03:00:00+01:00',
  },
  {
    value: 'Deep',
    start: '2026-01-15T03:00:00+01:00',
    end: '2026-01-15T05:00:00+01:00',
  },
  {
    value: 'REM',
    start: '2026-01-15T05:00:00+01:00',
    end: '2026-01-15T06:30:00+01:00',
  },
  {
    value: 'Core',
    start: '2026-01-15T00:00:00+01:00',
    end: '2026-01-15T04:00:00+01:00',
  },
  {
    value: 'Bizarre',
    start: '2026-01-15T01:00:00+01:00',
    end: '2026-01-15T01:30:00+01:00',
  },
];

describe('Apple Health batch sync (e2e)', () => {
  let client: TestClient;

  beforeAll(async (): Promise<void> => {
    client = await TestClient.create();
    client.setAuthCookie(await registerAndLogin(client));
  });

  afterAll(async (): Promise<void> => {
    await client.close();
  });

  async function issueToken(): Promise<string> {
    const res = await client
      .post('/integrations/health/sync-token')
      .expect(201);
    const body = res.body as { token: string; expiresAt: string };
    expect(body.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const lifetime = new Date(body.expiresAt).getTime() - Date.now();
    expect(lifetime).toBeGreaterThan(4 * 60 * 1000);
    expect(lifetime).toBeLessThanOrEqual(5 * 60 * 1000);
    return body.token;
  }

  function postBatch(token: string, body: object): request.Test {
    return request(client.getHttpServer())
      .post('/integrations/health/batch')
      .set('X-Sync-Token', token)
      .send(body);
  }

  async function fieldsByMetric(): Promise<Map<string, FieldView>> {
    const res = await client.get('/health/custom-fields').expect(200);
    const fields = res.body as FieldView[];
    return new Map(
      fields
        .filter((field) => field.appleWatchMetric)
        .map((field) => [field.appleWatchMetric as string, field]),
    );
  }

  async function valueOf(fieldId: string): Promise<string | undefined> {
    const res = await client.get('/health/daily-logs').expect(200);
    return (res.body as LogView[])
      .flatMap((log) => log.fieldValues ?? [])
      .find((value) => value.customFieldId === fieldId)?.value;
  }

  it('should require a JWT to issue a sync token', async (): Promise<void> => {
    await request(client.getHttpServer())
      .post('/integrations/health/sync-token')
      .expect(401);
  });

  it('should store quantities and a computed night encrypted, creating the fields', async (): Promise<void> => {
    // Arrange
    const token = await issueToken();

    // Act
    const res = await postBatch(token, {
      date: '2026-01-15',
      quantities: [
        { metric: AppleWatchMetric.STEPS, value: 8042.46 },
        { metric: AppleWatchMetric.HEART_RATE_VARIABILITY, value: 48.26 },
      ],
      sleepSamples: NIGHT,
    }).expect(201);

    // Assert
    const result = res.body as StoredResult;
    expect(result.stored).toEqual(
      expect.arrayContaining([
        { metric: 'STEPS', value: 8042.5 },
        { metric: 'HEART_RATE_VARIABILITY', value: 48.3 },
        { metric: 'SLEEP', value: 7 },
        { metric: 'BEDTIME', value: 23.5 },
      ]),
    );
    expect(result.createdFields.sort()).toEqual(
      ['BEDTIME', 'HEART_RATE_VARIABILITY', 'SLEEP', 'STEPS'].sort(),
    );
    expect(result.ignoredSleepLabels).toEqual(['Bizarre']);

    const fields = await fieldsByMetric();
    expect(fields.get('STEPS')).toMatchObject({
      name: 'Pas',
      category: 'Apple Santé',
    });
    expect(fields.get('BEDTIME')).toMatchObject({
      name: 'Heure du coucher',
      optionsOrder: ['isHourly'],
    });
    expect(await valueOf(fields.get('STEPS')!.id)).toBe('8042.5');
    expect(await valueOf(fields.get('SLEEP')!.id)).toBe('7');
    expect(await valueOf(fields.get('BEDTIME')!.id)).toBe('23.5');

    const stored = await withDatabase((db) =>
      db.query<Array<{ value: string }>>(
        'SELECT value FROM field_values WHERE custom_field_id = $1',
        [fields.get('STEPS')!.id],
      ),
    );
    expect(stored).toHaveLength(1);
    expect(stored[0].value).not.toContain('8042');
  });

  it('should be idempotent when the same day is sent twice', async (): Promise<void> => {
    // Arrange
    const body = {
      date: '2026-01-15',
      quantities: [{ metric: AppleWatchMetric.STEPS, value: 8042.46 }],
      sleepSamples: NIGHT,
    };

    // Act
    await postBatch(await issueToken(), body).expect(201);
    await postBatch(await issueToken(), body).expect(201);

    // Assert
    const fields = await fieldsByMetric();
    expect(await valueOf(fields.get('STEPS')!.id)).toBe('8042.5');
    expect(await valueOf(fields.get('SLEEP')!.id)).toBe('7');
    const rows = await withDatabase((db) =>
      db.query<Array<{ count: string }>>(
        'SELECT count(*) FROM field_values WHERE custom_field_id = $1',
        [fields.get('SLEEP')!.id],
      ),
    );
    expect(Number(rows[0].count)).toBe(1);
  });

  it('should reject a sync token that was already used', async (): Promise<void> => {
    // Arrange
    const token = await issueToken();
    await postBatch(token, { date: '2026-01-16' }).expect(201);

    // Act
    const res = await postBatch(token, { date: '2026-01-16' });

    // Assert
    expect(res.status).toBe(401);
  });

  it('should reject an expired sync token', async (): Promise<void> => {
    // Arrange
    const token = await issueToken();
    await withDatabase((db) =>
      db.query(
        `UPDATE health_sync_tokens SET expires_at = now() - interval '1 minute' WHERE used_at IS NULL`,
      ),
    );

    // Act
    const res = await postBatch(token, { date: '2026-01-16' });

    // Assert
    expect(res.status).toBe(401);
  });

  it.each(['', 'not-a-token', 'x'.repeat(43)])(
    'should reject the invalid sync token %p',
    async (token): Promise<void> => {
      const res = await postBatch(token, { date: '2026-01-16' });
      expect(res.status).toBe(401);
    },
  );

  it('should reject a request without any credential', async (): Promise<void> => {
    await request(client.getHttpServer())
      .post('/integrations/health/batch')
      .send({ date: '2026-01-16' })
      .expect(401);
  });

  it('should accept a permanent API key', async (): Promise<void> => {
    // Arrange
    const key = await client
      .post('/api-keys', { name: 'Automatisation' })
      .expect(201);
    const secretKey = (key.body as { secretKey: string }).secretKey;

    // Act
    const res = await request(client.getHttpServer())
      .post('/integrations/health/batch')
      .set('x-api-key', secretKey)
      .send({
        date: '2026-01-17',
        quantities: [
          { metric: AppleWatchMetric.WATER_CONSUMPTION, value: 1.5 },
        ],
      })
      .expect(201);

    // Assert
    expect((res.body as StoredResult).stored).toEqual([
      { metric: 'WATER_CONSUMPTION', value: 1.5 },
    ]);
  });

  it('should reject an invalid payload with a 400', async (): Promise<void> => {
    const invalidBodies: object[] = [
      {},
      { date: '2026-02-30' },
      { date: '2026-01-17', quantities: [{ metric: 'NOPE', value: 1 }] },
      { date: '2026-01-17', quantities: [{ metric: 'STEPS', value: 'abc' }] },
      {
        date: '2026-01-17',
        sleepSamples: [{ value: 'Core', start: 'x', end: 'y' }],
      },
      {
        date: '2026-01-17',
        sleepSamples: Array.from({ length: 501 }, () => NIGHT[1]),
      },
    ];

    for (const body of invalidBodies) {
      const res = await postBatch(await issueToken(), body);
      expect(res.status).toBe(400);
    }
  });

  it('should accept what the Apple shortcut sends: lines, number strings and empty readings', async (): Promise<void> => {
    // Arrange
    const token = await issueToken();

    // Act
    const res = await postBatch(token, {
      date: '2026-01-19',
      quantities: [
        { metric: AppleWatchMetric.STEPS, value: '8 042,5' },
        { metric: AppleWatchMetric.RESTING_HEART_RATE, value: '' },
        { metric: AppleWatchMetric.RESPIRATORY_RATE, value: 0 },
      ],
      sleepLines: [
        'Asleep (Core)|2026-01-18T23:15:00|2026-01-19T03:15:00',
        'Endormi|2026-01-19T03:00:00+01:00|2026-01-19T06:45:00+01:00',
      ].join('\n'),
    }).expect(201);

    // Assert
    const result = res.body as StoredResult;
    expect(result.success).toBe(true);
    expect(result.stored).toEqual(
      expect.arrayContaining([
        { metric: 'STEPS', value: 8042.5 },
        { metric: 'SLEEP', value: 7.5 },
        { metric: 'BEDTIME', value: 23.25 },
      ]),
    );
    expect(result.stored.map((entry) => entry.metric)).not.toContain(
      'RESTING_HEART_RATE',
    );
  });

  it('should keep the legacy sync endpoint working', async (): Promise<void> => {
    // Arrange
    const key = await client.post('/api-keys', { name: 'Ancien' }).expect(201);
    const secretKey = (key.body as { secretKey: string }).secretKey;

    // Act
    await request(client.getHttpServer())
      .post('/integrations/health/sync')
      .set('x-api-key', secretKey)
      .send({ metric: AppleWatchMetric.STEPS, value: 12, date: '2026-01-18' })
      .expect(201);

    // Assert
    const fields = await fieldsByMetric();
    expect(await valueOf(fields.get('STEPS')!.id)).toBeDefined();
  });
});
