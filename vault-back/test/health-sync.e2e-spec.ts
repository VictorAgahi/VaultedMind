import { TestClient } from './common/test-client.js';
import { v4 as uuidv4 } from 'uuid';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { FieldType } from '../src/modules/health/domain/enums/field-type.enum.js';
import { AppleWatchMetric } from '../src/modules/health/domain/enums/apple-watch-metric.enum.js';

async function registerAndLogin(client: TestClient): Promise<string> {
  const email = `sync-${uuidv4()}@example.com`;
  const password = 'Password123!';
  await client
    .post('/auth/register', { email, password, healthDataConsent: true })
    .expect(201);
  const res = await client.post('/auth/login', { email, password }).expect(200);
  return (res.header['set-cookie'] as unknown as string[])[0];
}

async function readStoredValue(fieldId: string): Promise<string> {
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
    const rows: Array<{ value: string }> = await db.query(
      'SELECT value FROM field_values WHERE custom_field_id = $1',
      [fieldId],
    );
    return rows[0].value;
  } finally {
    await db.destroy();
  }
}

describe('Apple Health sync (e2e)', () => {
  let client: TestClient;
  let secretKey!: string;
  let fieldId!: string;

  beforeAll(async (): Promise<void> => {
    client = await TestClient.create();
    client.setAuthCookie(await registerAndLogin(client));

    const field = await client
      .post('/health/custom-fields', {
        name: 'Sommeil',
        fieldType: FieldType.NUMBER,
        appleWatchMetric: AppleWatchMetric.SLEEP,
      })
      .expect(201);
    fieldId = (field.body as { id: string }).id;

    const key = await client
      .post('/api-keys', { name: 'Raccourci' })
      .expect(201);
    secretKey = (key.body as { secretKey: string }).secretKey;
  });

  afterAll(async (): Promise<void> => {
    await client.close();
  });

  it('should store the synced value encrypted and return it decrypted', async (): Promise<void> => {
    // Act
    await request(client.getHttpServer())
      .post('/integrations/health/sync')
      .set('x-api-key', secretKey)
      .send({
        metric: AppleWatchMetric.SLEEP,
        value: '7,45',
        date: '2026-10-29',
      })
      .expect(201);

    // Assert
    const stored = await readStoredValue(fieldId);
    expect(stored).not.toBe('7.5');

    const res = await client.get('/health/daily-logs').expect(200);
    const logs = res.body as Array<{
      fieldValues?: Array<{ customFieldId: string; value: string }>;
    }>;
    const synced = logs
      .flatMap((log) => log.fieldValues ?? [])
      .find((value) => value.customFieldId === fieldId);
    expect(synced?.value).toBe('7.5');
  });
});
