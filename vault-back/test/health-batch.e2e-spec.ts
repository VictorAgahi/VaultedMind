import { TestClient } from './common/test-client.js';
import { v4 as uuidv4 } from 'uuid';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppleWatchMetric } from '../src/modules/health/domain/enums/apple-watch-metric.enum.js';

interface StoredResult {
  success: boolean;
  stored: Array<{ metric: string; value: number }>;
  createdFields: string[];
  linkedFields: string[];
  ambiguousMetrics: string[];
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
      [
        'BEDTIME',
        'HEART_RATE_VARIABILITY',
        'SLEEP',
        'SLEEP_CORE',
        'SLEEP_DEEP',
        'SLEEP_REM',
        'STEPS',
      ].sort(),
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
      { date: 'x'.repeat(65) },
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

  it('should fall back to the current day when the date is unreadable', async (): Promise<void> => {
    // The shortcut's date formatting depends on the iOS locale settings
    for (const date of ['31 oct. 2026', undefined]) {
      const res = await postBatch(await issueToken(), {
        date,
        quantities: [{ metric: 'STEPS', value: 1234 }],
      });
      expect(res.status).toBe(201);
      expect((res.body as StoredResult).stored).toEqual([
        { metric: 'STEPS', value: 1234 },
      ]);
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

describe('Apple Health field linking and mapping (e2e)', () => {
  let client: TestClient;

  beforeAll(async (): Promise<void> => {
    client = await TestClient.create();
    client.setAuthCookie(await registerAndLogin(client));
  });

  afterAll(async (): Promise<void> => {
    await client.close();
  });

  async function createNumberField(
    name: string,
    extra: object = {},
  ): Promise<FieldView> {
    const res = await client
      .post('/health/custom-fields', { name, fieldType: 'NUMBER', ...extra })
      .expect(201);
    return res.body as FieldView;
  }

  async function allFields(): Promise<FieldView[]> {
    const res = await client.get('/health/custom-fields').expect(200);
    return res.body as FieldView[];
  }

  async function sync(body: object): Promise<StoredResult> {
    const issued = await client
      .post('/integrations/health/sync-token')
      .expect(201);
    const token = (issued.body as { token: string }).token;
    const res = await request(client.getHttpServer())
      .post('/integrations/health/batch')
      .set('X-Sync-Token', token)
      .send(body)
      .expect(201);
    return res.body as StoredResult;
  }

  async function valueOf(fieldId: string): Promise<string | undefined> {
    const res = await client.get('/health/daily-logs').expect(200);
    return (res.body as LogView[])
      .flatMap((log) => log.fieldValues ?? [])
      .find((value) => value.customFieldId === fieldId)?.value;
  }

  it('should link an existing deep sleep field and fill it from the sleep stages', async (): Promise<void> => {
    // Arrange
    const deepField = await createNumberField('Temps de sommeil profond');

    // Act
    const result = await sync({ date: '2026-01-15', sleepSamples: NIGHT });

    // Assert
    expect(result.linkedFields).toEqual(['SLEEP_DEEP']);
    expect(result.createdFields).not.toContain('SLEEP_DEEP');
    expect(result.stored).toEqual(
      expect.arrayContaining([
        { metric: 'SLEEP_DEEP', value: 2 },
        { metric: 'SLEEP_REM', value: 1.5 },
        { metric: 'SLEEP_CORE', value: 4.5 },
      ]),
    );
    expect(result.stored.map((entry) => entry.metric)).not.toContain(
      'SLEEP_AWAKE',
    );
    const fields = await allFields();
    expect(fields.find((f) => f.id === deepField.id)?.appleWatchMetric).toBe(
      'SLEEP_DEEP',
    );
    expect(
      fields.filter((f) => f.appleWatchMetric === 'SLEEP_DEEP'),
    ).toHaveLength(1);
    expect(fields.filter((f) => f.name.startsWith('Sommeil profond'))).toEqual(
      [],
    );
    expect(await valueOf(deepField.id)).toBe('2');
  });

  it('should keep filling the linked field on the next sync without linking again', async (): Promise<void> => {
    // Arrange / Act
    const result = await sync({ date: '2026-01-15', sleepSamples: NIGHT });

    // Assert
    expect(result.linkedFields).toEqual([]);
    expect(result.createdFields).toEqual([]);
  });

  it('should fall back to an Apple Santé field when several fields match', async (): Promise<void> => {
    // Arrange
    await createNumberField('Pas');
    await createNumberField('Nombre de pas');

    // Act
    const result = await sync({
      date: '2026-01-15',
      quantities: [{ metric: 'STEPS', value: 4210 }],
    });

    // Assert
    expect(result.ambiguousMetrics).toEqual(['STEPS']);
    expect(result.createdFields).toEqual(['STEPS']);
    const fields = await allFields();
    expect(fields.filter((f) => f.appleWatchMetric === 'STEPS')).toHaveLength(
      1,
    );
    expect(fields.find((f) => f.appleWatchMetric === 'STEPS')?.category).toBe(
      'Apple Santé',
    );
  });

  it('should not link a clock-time field to a duration metric', async (): Promise<void> => {
    // Arrange
    await createNumberField('Fréquence respiratoire', {
      optionsOrder: ['isHourly'],
    });

    // Act
    const result = await sync({
      date: '2026-01-15',
      quantities: [{ metric: 'RESPIRATORY_RATE', value: 14.2 }],
    });

    // Assert
    expect(result.createdFields).toEqual(['RESPIRATORY_RATE']);
    expect(result.linkedFields).toEqual([]);
  });

  it('should move a metric to another field and keep one field per metric', async (): Promise<void> => {
    // Arrange
    const first = await createNumberField('Mes eaux A');
    const second = await createNumberField('Mes eaux B');

    // Act
    await client
      .patch(`/health/custom-fields/${first.id}`, {
        appleWatchMetric: 'WATER_CONSUMPTION',
      })
      .expect(200);
    await client
      .patch(`/health/custom-fields/${second.id}`, {
        appleWatchMetric: 'WATER_CONSUMPTION',
      })
      .expect(200);

    // Assert
    const fields = await allFields();
    expect(
      fields.find((f) => f.id === first.id)?.appleWatchMetric ?? null,
    ).toBeNull();
    expect(fields.find((f) => f.id === second.id)?.appleWatchMetric).toBe(
      'WATER_CONSUMPTION',
    );
    expect(
      fields.filter((f) => f.appleWatchMetric === 'WATER_CONSUMPTION'),
    ).toHaveLength(1);
  });

  it('should unset a metric with null and accept the new stage metrics', async (): Promise<void> => {
    // Arrange
    const field = await createNumberField('Mon paradoxal');
    await client
      .patch(`/health/custom-fields/${field.id}`, {
        appleWatchMetric: 'SLEEP_AWAKE',
      })
      .expect(200);

    // Act
    const res = await client
      .patch(`/health/custom-fields/${field.id}`, { appleWatchMetric: null })
      .expect(200);

    // Assert
    expect((res.body as FieldView).appleWatchMetric ?? null).toBeNull();
  });

  it('should reject an unknown metric and a metric on a non-number field', async (): Promise<void> => {
    // Arrange
    const text = await client
      .post('/health/custom-fields', { name: 'Journal', fieldType: 'STRING' })
      .expect(201);
    const textId = (text.body as FieldView).id;

    // Act / Assert
    await client
      .patch(`/health/custom-fields/${textId}`, { appleWatchMetric: 'NOPE' })
      .expect(400);
    await client
      .patch(`/health/custom-fields/${textId}`, { appleWatchMetric: 'STEPS' })
      .expect(400);
  });
});
