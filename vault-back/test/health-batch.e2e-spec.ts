import { TestClient } from './common/test-client.js';
import { v4 as uuidv4 } from 'uuid';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { ConfigService } from '@nestjs/config';
import { AppleWatchMetric } from '../src/modules/health/domain/enums/apple-watch-metric.enum.js';
import { EncryptionService } from '../src/common/security/encryption.service.js';

interface StoredResult {
  success: boolean;
  stored: Array<{ metric: string; value: number }>;
  createdFields: string[];
  linkedFields: string[];
  ambiguousMetrics: string[];
  ignoredSleepLabels: string[];
  autoLinked: Array<{ metric: string; fieldName: string }>;
  pendingCount: number;
}

interface LogView {
  logDate: string;
  fieldValues?: Array<{
    customFieldId: string;
    value: string;
    source?: string;
  }>;
}

interface ProposalView {
  metric: string;
  label: string;
  exampleValue: number | null;
  status: 'PENDING_LINK' | 'PENDING_NEW';
  relevance: 'high' | 'low';
  fieldId: string | null;
  suggestedName: string | null;
  confidence: number | null;
}

interface ProposalsView {
  proposals: ProposalView[];
  ignored: Array<{ metric: string; label: string }>;
  autoLinked: Array<{ metric: string; fieldName: string }>;
  legacyFields: Array<{ id: string; name: string; metric: string }>;
}

interface AcceptView {
  metric: string;
  fieldId: string;
  fieldName: string;
  unit: string | null;
  created: boolean;
  filledDays: number;
}

interface FieldView {
  id: string;
  name: string;
  category?: string;
  appleWatchMetric?: string;
  optionsOrder?: string[];
  appleWatchUnit?: string;
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

const encryption = new EncryptionService(new ConfigService());

async function userIdOf(client: TestClient): Promise<string> {
  const res = await client.get('/auth/me').expect(200);
  return (res.body as { id: string }).id;
}

/** The raw store of a user for a day, decrypted: metric to value. */
async function rawMetrics(
  userId: string,
  date: string,
): Promise<Map<string, { stored: string; plain: string }>> {
  const rows = await withDatabase((db) =>
    db.query<Array<{ metric: string; value: string }>>(
      'SELECT metric, value FROM health_daily_metrics WHERE user_id = $1 AND log_date = $2',
      [userId, date],
    ),
  );
  return new Map(
    rows.map((row) => [
      row.metric,
      { stored: row.value, plain: encryption.decrypt(row.value) },
    ]),
  );
}

async function valuesOn(
  client: TestClient,
  fieldId: string,
): Promise<Map<string, { value: string; source?: string }>> {
  const res = await client.get('/health/daily-logs').expect(200);
  const byDate = new Map<string, { value: string; source?: string }>();
  for (const log of res.body as LogView[]) {
    const found = log.fieldValues?.find((v) => v.customFieldId === fieldId);
    if (found) {
      byDate.set(new Date(log.logDate).toISOString().slice(0, 10), {
        value: found.value,
        source: found.source,
      });
    }
  }
  return byDate;
}

async function proposalsOf(client: TestClient): Promise<ProposalsView> {
  const res = await client.get('/integrations/health/proposals').expect(200);
  return res.body as ProposalsView;
}

describe('Apple Health batch sync (e2e)', () => {
  let client: TestClient;
  let userId: string;

  beforeAll(async (): Promise<void> => {
    client = await TestClient.create();
    client.setAuthCookie(await registerAndLogin(client));
    userId = await userIdOf(client);
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

  async function linkedFields(): Promise<FieldView[]> {
    const res = await client.get('/health/custom-fields').expect(200);
    return (res.body as FieldView[]).filter((field) => field.appleWatchMetric);
  }

  it('should require a JWT to issue a sync token', async (): Promise<void> => {
    await request(client.getHttpServer())
      .post('/integrations/health/sync-token')
      .expect(401);
  });

  it('should keep the quantities and the computed night encrypted without creating any field', async (): Promise<void> => {
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
    expect(result.stored).toEqual([]);
    expect(result.createdFields).toEqual([]);
    expect(result.autoLinked).toEqual([]);
    expect(result.pendingCount).toBe(7);
    expect(result.ignoredSleepLabels).toEqual(['Bizarre']);
    expect(await linkedFields()).toEqual([]);

    const raw = await rawMetrics(userId, '2026-01-15');
    expect([...raw.keys()].sort()).toEqual(
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
    expect(raw.get('STEPS')?.stored).not.toContain('8042');
    expect(raw.get('STEPS')?.plain).toBe('8042.5');
    expect(raw.get('SLEEP')?.plain).toBe('7');
    expect(raw.get('BEDTIME')?.plain).toBe('23.5');
    expect(raw.get('SLEEP_DEEP')?.plain).toBe('2');
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
    const rows = await withDatabase((db) =>
      db.query<Array<{ count: string }>>(
        `SELECT count(*) FROM health_daily_metrics WHERE user_id = $1 AND log_date = '2026-01-15' AND metric = 'SLEEP'`,
        [userId],
      ),
    );
    expect(Number(rows[0].count)).toBe(1);
    expect((await rawMetrics(userId, '2026-01-15')).get('SLEEP')?.plain).toBe(
      '7',
    );
    expect(await linkedFields()).toEqual([]);
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
    expect((res.body as StoredResult).success).toBe(true);
    expect(
      (await rawMetrics(userId, '2026-01-17')).get('WATER_CONSUMPTION')?.plain,
    ).toBe('1.5');
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
      expect((res.body as StoredResult).success).toBe(true);
    }
    const rows = await withDatabase((db) =>
      db.query<Array<{ log_date: string }>>(
        `SELECT to_char(log_date, 'YYYY-MM-DD') AS log_date FROM health_daily_metrics WHERE user_id = $1 AND metric = 'STEPS' AND log_date > '2026-02-01'`,
        [userId],
      ),
    );
    expect(rows).toHaveLength(1);
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
    expect((res.body as StoredResult).success).toBe(true);
    const raw = await rawMetrics(userId, '2026-01-19');
    expect(raw.get('STEPS')?.plain).toBe('8042.5');
    expect(raw.get('SLEEP')?.plain).toBe('7.5');
    expect(raw.get('BEDTIME')?.plain).toBe('23.25');
    expect(raw.has('RESTING_HEART_RATE')).toBe(false);
    expect(raw.has('RESPIRATORY_RATE')).toBe(false);
  });

  it('should list the proposals with an example and their relevance', async (): Promise<void> => {
    // Arrange / Act
    const view = await proposalsOf(client);

    // Assert
    const byMetric = new Map(view.proposals.map((p) => [p.metric, p]));
    expect(byMetric.get('SLEEP_DEEP')).toMatchObject({
      label: 'Sommeil profond',
      status: 'PENDING_NEW',
      suggestedName: 'Sommeil profond',
      relevance: 'high',
      exampleValue: 2,
    });
    expect(byMetric.get('WATER_CONSUMPTION')).toMatchObject({
      status: 'PENDING_NEW',
      relevance: 'low',
    });
    expect(view.legacyFields).toEqual([]);
    expect(view.ignored).toEqual([]);
  });

  it('should create the accepted new field and fill its past days', async (): Promise<void> => {
    // Arrange / Act
    const res = await client
      .post('/integrations/health/proposals/SLEEP/accept', {
        create: { name: 'Mon sommeil' },
      })
      .expect(200);

    // Assert
    const accepted = res.body as AcceptView;
    expect(accepted).toMatchObject({
      metric: 'SLEEP',
      fieldName: 'Mon sommeil',
      unit: 'hours',
      created: true,
      filledDays: 2,
    });
    const field = (await linkedFields()).find((f) => f.id === accepted.fieldId);
    expect(field).toMatchObject({
      appleWatchMetric: 'SLEEP',
      category: 'Apple Santé',
      appleWatchUnit: 'hours',
    });
    const values = await valuesOn(client, accepted.fieldId);
    expect(values.get('2026-01-15')).toEqual({ value: '7', source: 'health' });
    expect(values.get('2026-01-19')).toEqual({
      value: '7.5',
      source: 'health',
    });
    const view = await proposalsOf(client);
    expect(view.proposals.map((p) => p.metric)).not.toContain('SLEEP');
    expect(view.legacyFields).toEqual([]);
  });

  it('should never overwrite a value typed by the user when filling past days', async (): Promise<void> => {
    // Arrange
    const created = await client
      .post('/health/custom-fields', {
        name: 'Marche du jour',
        fieldType: 'NUMBER',
      })
      .expect(201);
    const fieldId = (created.body as FieldView).id;
    await client
      .post('/health/daily-logs/entry', {
        logDate: '2026-01-15',
        values: [{ customFieldId: fieldId, value: '999' }],
      })
      .expect(201);

    // Act
    const res = await client
      .post('/integrations/health/proposals/STEPS/accept', { fieldId })
      .expect(200);

    // Assert
    expect((res.body as AcceptView).created).toBe(false);
    const values = await valuesOn(client, fieldId);
    expect(values.get('2026-01-15')?.value).toBe('999');
    expect(values.get('2026-01-15')?.source ?? null).toBeNull();
    expect(values.get('2026-01-19')).toEqual({
      value: '8042.5',
      source: 'health',
    });
  });

  it('should refuse to accept a field that does not suit the metric', async (): Promise<void> => {
    // Arrange
    const created = await client
      .post('/health/custom-fields', {
        name: 'Réveil',
        fieldType: 'NUMBER',
        optionsOrder: ['isHourly'],
      })
      .expect(201);

    // Act / Assert
    await client
      .post('/integrations/health/proposals/SLEEP_REM/accept', {
        fieldId: (created.body as FieldView).id,
      })
      .expect(400);
    await client
      .post('/integrations/health/proposals/NOPE/accept', {})
      .expect(400);
  });

  it('should ignore a metric and bring it back on demand', async (): Promise<void> => {
    // Arrange / Act
    await client
      .post('/integrations/health/proposals/WATER_CONSUMPTION/ignore')
      .expect(200);
    const ignored = await proposalsOf(client);
    const back = await client
      .post('/integrations/health/proposals/WATER_CONSUMPTION/unignore')
      .expect(200);
    const restored = await proposalsOf(client);

    // Assert
    expect(ignored.ignored).toEqual([
      { metric: 'WATER_CONSUMPTION', label: 'Eau' },
    ]);
    expect(ignored.proposals.map((p) => p.metric)).not.toContain(
      'WATER_CONSUMPTION',
    );
    expect((back.body as { pendingCount: number }).pendingCount).toBe(
      restored.proposals.length,
    );
    expect(restored.ignored).toEqual([]);
    expect(restored.proposals.map((p) => p.metric)).toContain(
      'WATER_CONSUMPTION',
    );
  });

  it('should run the assistant again on demand, for the signed-in user only', async (): Promise<void> => {
    // Arrange / Act
    const run = await client
      .post('/integrations/health/proposals/run')
      .expect(200);

    // Assert
    expect(run.body as object).toMatchObject({ autoLinked: [] });
    await request(client.getHttpServer())
      .get('/integrations/health/proposals')
      .expect(401);
    await request(client.getHttpServer())
      .post('/integrations/health/proposals/STEPS/ignore')
      .expect(401);
  });

  it('should keep the legacy sync endpoint writing only to a linked field', async (): Promise<void> => {
    // Arrange
    const key = await client.post('/api-keys', { name: 'Ancien' }).expect(201);
    const secretKey = (key.body as { secretKey: string }).secretKey;
    const before = (await linkedFields()).length;

    // Act
    await request(client.getHttpServer())
      .post('/integrations/health/sync')
      .set('x-api-key', secretKey)
      .send({ metric: AppleWatchMetric.STEPS, value: 12, date: '2026-01-18' })
      .expect(201);
    await request(client.getHttpServer())
      .post('/integrations/health/sync')
      .set('x-api-key', secretKey)
      .send({
        metric: AppleWatchMetric.DAYLIGHT_MINUTES,
        value: 30,
        date: '2026-01-18',
      })
      .expect(201);

    // Assert
    const steps = (await linkedFields()).find(
      (f) => f.appleWatchMetric === 'STEPS',
    );
    expect((await valuesOn(client, steps!.id)).get('2026-01-18')?.value).toBe(
      '12',
    );
    expect(await linkedFields()).toHaveLength(before);
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

  it('should show no proposal of another user', async (): Promise<void> => {
    // Arrange / Act
    const view = await proposalsOf(client);

    // Assert
    expect(view).toEqual({
      proposals: [],
      ignored: [],
      autoLinked: [],
      legacyFields: [],
    });
  });

  it('should link a field with a typo by the rules and fill it from the sleep stages', async (): Promise<void> => {
    // Arrange
    const deepField = await createNumberField('Temps de someil profond');

    // Act
    const result = await sync({ date: '2026-01-15', sleepSamples: NIGHT });

    // Assert
    expect(result.autoLinked).toEqual([
      { metric: 'SLEEP_DEEP', fieldName: 'Temps de someil profond' },
    ]);
    expect(result.linkedFields).toEqual(['SLEEP_DEEP']);
    expect(result.createdFields).toEqual([]);
    expect(result.stored).toEqual([{ metric: 'SLEEP_DEEP', value: 2 }]);
    const fields = await allFields();
    expect(fields.find((f) => f.id === deepField.id)).toMatchObject({
      appleWatchMetric: 'SLEEP_DEEP',
      appleWatchUnit: 'hours',
    });
    expect(fields.filter((f) => f.appleWatchMetric)).toHaveLength(1);
    expect(fields.filter((f) => f.name.startsWith('Sommeil profond'))).toEqual(
      [],
    );
    expect((await valuesOn(client, deepField.id)).get('2026-01-15')).toEqual({
      value: '2',
      source: 'health',
    });
    expect(result.pendingCount).toBeGreaterThan(0);
    const view = await proposalsOf(client);
    expect(view.autoLinked).toEqual([
      expect.objectContaining({
        metric: 'SLEEP_DEEP',
        fieldName: 'Temps de someil profond',
      }),
    ]);
  });

  it('should keep filling the linked field on the next sync without linking again', async (): Promise<void> => {
    // Arrange / Act
    const result = await sync({ date: '2026-01-15', sleepSamples: NIGHT });

    // Assert
    expect(result.linkedFields).toEqual([]);
    expect(result.createdFields).toEqual([]);
    expect(result.stored).toEqual([{ metric: 'SLEEP_DEEP', value: 2 }]);
  });

  it('should only propose a field when several fields match, and link the one chosen', async (): Promise<void> => {
    // Arrange
    await createNumberField('Pas');
    const second = await createNumberField('Nombre de pas');

    // Act
    const result = await sync({
      date: '2026-01-15',
      quantities: [{ metric: 'STEPS', value: 4210 }],
    });
    const proposal = (await proposalsOf(client)).proposals.find(
      (p) => p.metric === 'STEPS',
    );
    const accepted = await client
      .post('/integrations/health/proposals/STEPS/accept', {
        fieldId: second.id,
      })
      .expect(200);

    // Assert
    expect(result.linkedFields).toEqual([]);
    expect(result.createdFields).toEqual([]);
    expect(proposal).toMatchObject({ status: 'PENDING_LINK', confidence: 0.5 });
    expect(accepted.body as AcceptView).toMatchObject({
      fieldId: second.id,
      filledDays: 1,
    });
    const fields = await allFields();
    expect(fields.filter((f) => f.appleWatchMetric === 'STEPS')).toEqual([
      expect.objectContaining({ id: second.id }),
    ]);
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
    expect(result.linkedFields).toEqual([]);
    expect(
      (await allFields()).filter(
        (f) => f.appleWatchMetric === 'RESPIRATORY_RATE',
      ),
    ).toEqual([]);
    expect(
      (await proposalsOf(client)).proposals.find(
        (p) => p.metric === 'RESPIRATORY_RATE',
      ),
    ).toMatchObject({ status: 'PENDING_NEW', relevance: 'low' });
  });

  it('should list a field auto-created by an earlier version so that it can be deleted', async (): Promise<void> => {
    // Arrange
    const legacy = await createNumberField('Calories actives', {
      category: 'Apple Santé',
      appleWatchMetric: 'ACTIVE_CALORIES',
    });

    // Act
    const before = await proposalsOf(client);
    await client.delete(`/health/custom-fields/${legacy.id}`).expect(204);
    const after = await proposalsOf(client);

    // Assert
    expect(before.legacyFields).toEqual([
      { id: legacy.id, name: 'Calories actives', metric: 'ACTIVE_CALORIES' },
    ]);
    expect(after.legacyFields).toEqual([]);
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

  it('should infer the unit of a duration linked by hand', async (): Promise<void> => {
    // Arrange
    const field = await createNumberField('Sieste (min)');

    // Act
    const res = await client
      .patch(`/health/custom-fields/${field.id}`, {
        appleWatchMetric: 'SLEEP_CORE',
      })
      .expect(200);

    // Assert
    expect((res.body as FieldView).appleWatchUnit).toBe('minutes');
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
    expect((res.body as FieldView).appleWatchUnit ?? null).toBeNull();
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

/** The night of NIGHT moved forward by `days` days. */
function nightShifted(days: number): typeof NIGHT {
  const shift = (instant: string): string => {
    const moved = new Date(instant);
    moved.setUTCDate(moved.getUTCDate() + days);
    return moved.toISOString();
  };
  return NIGHT.map((sample) => ({
    value: sample.value,
    start: shift(sample.start),
    end: shift(sample.end),
  }));
}

describe('Apple Health legacy links and manual mapping (e2e)', () => {
  let client: TestClient;
  let userId: string;

  beforeAll(async (): Promise<void> => {
    client = await TestClient.create();
    client.setAuthCookie(await registerAndLogin(client));
    userId = await userIdOf(client);
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

  /** Makes the stored decisions look like those of a user who never ran the current version. */
  async function forgetAssistantVersion(): Promise<void> {
    await withDatabase(async (db) => {
      const [row] = await db.query<
        Array<{ health_metric_decisions_encrypted: string | null }>
      >('SELECT health_metric_decisions_encrypted FROM users WHERE id = $1', [
        userId,
      ]);
      const stored = row.health_metric_decisions_encrypted;
      const state = stored
        ? (JSON.parse(encryption.decrypt(stored)) as Record<string, unknown>)
        : { decisions: {}, skipped: [] };
      delete state.version;
      await db.query(
        'UPDATE users SET health_metric_decisions_encrypted = $1 WHERE id = $2',
        [encryption.encrypt(JSON.stringify(state)), userId],
      );
    });
  }

  it('should move a legacy "Sommeil profond" link to the field "TEMPS SOMMEIL PROFOND" and fill the past days', async (): Promise<void> => {
    // Arrange: a field auto-created by an earlier version receives the deep sleep
    const legacy = await createNumberField('Sommeil profond', {
      category: 'Apple Santé',
      appleWatchMetric: 'SLEEP_DEEP',
    });
    await sync({ date: '2026-01-15', sleepSamples: NIGHT });
    await sync({ date: '2026-01-16', sleepSamples: nightShifted(1) });
    const legacyBefore = await valuesOn(client, legacy.id);
    const mine = await createNumberField('TEMPS SOMMEIL PROFOND');
    await client
      .post('/health/daily-logs/entry', {
        logDate: '2026-01-16',
        values: [{ customFieldId: mine.id, value: '7' }],
      })
      .expect(201);
    await forgetAssistantVersion();

    // Act
    const result = await sync({
      date: '2026-01-17',
      sleepSamples: nightShifted(2),
    });

    // Assert
    expect(legacyBefore.get('2026-01-15')).toEqual({
      value: '2',
      source: 'health',
    });
    expect(result.autoLinked).toEqual([
      { metric: 'SLEEP_DEEP', fieldName: 'TEMPS SOMMEIL PROFOND' },
    ]);
    const fields = await allFields();
    expect(fields.find((f) => f.id === mine.id)).toMatchObject({
      appleWatchMetric: 'SLEEP_DEEP',
      appleWatchUnit: 'hours',
    });
    expect(
      fields.find((f) => f.id === legacy.id)?.appleWatchMetric ?? null,
    ).toBeNull();
    expect(
      fields.filter((f) => f.appleWatchMetric === 'SLEEP_DEEP'),
    ).toHaveLength(1);
    const values = await valuesOn(client, mine.id);
    expect(values.get('2026-01-15')).toEqual({ value: '2', source: 'health' });
    expect(values.get('2026-01-16')?.value).toBe('7');
    expect(values.get('2026-01-16')?.source ?? null).toBeNull();
    expect(values.get('2026-01-17')).toEqual({ value: '2', source: 'health' });
    const view = await proposalsOf(client);
    expect(view.autoLinked).toEqual([
      expect.objectContaining({
        metric: 'SLEEP_DEEP',
        fieldName: 'TEMPS SOMMEIL PROFOND',
      }),
    ]);
    expect(view.legacyFields).toEqual([]);
  });

  it('should keep feeding the field of the user and not examine it again on the next sync', async (): Promise<void> => {
    // Arrange / Act
    const result = await sync({
      date: '2026-01-18',
      sleepSamples: nightShifted(3),
    });

    // Assert
    expect(result.autoLinked).toEqual([]);
    expect(result.stored).toEqual([{ metric: 'SLEEP_DEEP', value: 2 }]);
  });

  it('should fill the past days when the user links a metric by hand, without touching typed values', async (): Promise<void> => {
    // Arrange
    await sync({
      date: '2026-01-15',
      quantities: [{ metric: 'STEPS', value: 1000 }],
    });
    await sync({
      date: '2026-01-16',
      quantities: [{ metric: 'STEPS', value: 2000 }],
    });
    await sync({
      date: '2026-01-17',
      quantities: [{ metric: 'STEPS', value: 3000 }],
    });
    const counter = await createNumberField('Compteur');
    await client
      .post('/health/daily-logs/entry', {
        logDate: '2026-01-16',
        values: [{ customFieldId: counter.id, value: '555' }],
      })
      .expect(201);

    // Act
    const res = await client
      .patch(`/health/custom-fields/${counter.id}`, {
        appleWatchMetric: 'STEPS',
      })
      .expect(200);

    // Assert
    expect((res.body as { healthFilledDays?: number }).healthFilledDays).toBe(
      2,
    );
    const values = await valuesOn(client, counter.id);
    expect(values.get('2026-01-15')).toEqual({
      value: '1000',
      source: 'health',
    });
    expect(values.get('2026-01-16')?.value).toBe('555');
    expect(values.get('2026-01-16')?.source ?? null).toBeNull();
    expect(values.get('2026-01-17')).toEqual({
      value: '3000',
      source: 'health',
    });
    const view = await proposalsOf(client);
    expect(view.proposals.find((p) => p.metric === 'STEPS')).toBeUndefined();
  });

  it('should not report a backfill for an update that leaves the link as it is', async (): Promise<void> => {
    // Arrange
    const counter = (await allFields()).find((f) => f.name === 'Compteur');

    // Act
    const res = await client
      .patch(`/health/custom-fields/${counter!.id}`, {
        name: 'Compteur de pas',
      })
      .expect(200);

    // Assert
    expect(
      (res.body as { healthFilledDays?: number }).healthFilledDays,
    ).toBeUndefined();
  });
});
