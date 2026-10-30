import { TestClient } from './common/test-client.js';
import { v4 as uuidv4 } from 'uuid';
import { FieldType } from '../src/modules/health/domain/enums/field-type.enum.js';

interface FieldBody {
  id: string;
  construct?: string;
  constructOverride?: string;
}

interface MeBody {
  preferences: {
    reminderEnabled: boolean;
    insightTargets: Array<{
      fieldId: string;
      direction: string;
      value?: string;
    }>;
  };
}

describe('Insight targets, constructs and obvious overrides (e2e)', () => {
  let client: TestClient;
  let freeTextFieldId: string;
  let numberFieldId: string;

  const createField = async (
    name: string,
    fieldType: FieldType,
  ): Promise<string> => {
    const res = await client
      .post('/health/custom-fields', { name, fieldType })
      .expect(201);
    return (res.body as FieldBody).id;
  };

  const targetsOf = async (): Promise<
    MeBody['preferences']['insightTargets']
  > => {
    const res = await client.get('/auth/me').expect(200);
    return (res.body as MeBody).preferences.insightTargets;
  };

  beforeAll(async (): Promise<void> => {
    client = await TestClient.create();
    const email = `patterns-${uuidv4()}@example.com`;
    const password = 'Password123!';
    await client
      .post('/auth/register', { email, password, healthDataConsent: true })
      .expect(201);
    const login = await client
      .post('/auth/login', { email, password })
      .expect(200);
    client.setAuthCookie(login.header['set-cookie'][0]);

    freeTextFieldId = await createField('Humeur', FieldType.STRING);
    numberFieldId = await createField('Anxiété', FieldType.NUMBER);
  });

  afterAll(async (): Promise<void> => {
    await client.close();
  });

  describe('PATCH /users/me/preferences with insightTargets', () => {
    it('should save a value target and a NEUTRAL direction', async (): Promise<void> => {
      // Arrange
      const insightTargets = [
        {
          fieldId: freeTextFieldId,
          direction: 'LOWER_IS_BETTER',
          value: 'agressif',
        },
        { fieldId: freeTextFieldId, direction: 'NEUTRAL', value: 'calme' },
        { fieldId: numberFieldId, direction: 'NEUTRAL' },
      ];

      // Act
      await client
        .patch('/users/me/preferences', { insightTargets })
        .expect(200);

      // Assert
      expect(await targetsOf()).toEqual(insightTargets);
    });

    it('should keep the targets when an update omits them', async (): Promise<void> => {
      // Arrange
      const before = await targetsOf();

      // Act
      await client
        .patch('/users/me/preferences', { reminderEnabled: false })
        .expect(200);

      // Assert
      const res = await client.get('/auth/me').expect(200);
      const body = res.body as MeBody;
      expect(body.preferences.reminderEnabled).toBe(false);
      expect(body.preferences.insightTargets).toEqual(before);
      expect(before).toHaveLength(3);
    });

    it('should refuse an unordered text field used as a scale', async (): Promise<void> => {
      await client
        .patch('/users/me/preferences', {
          insightTargets: [{ fieldId: freeTextFieldId, direction: 'NEUTRAL' }],
        })
        .expect(400);
    });

    it('should refuse a value on a number field, a duplicate and more than 6 targets', async (): Promise<void> => {
      await client
        .patch('/users/me/preferences', {
          insightTargets: [
            { fieldId: numberFieldId, direction: 'NEUTRAL', value: 'x' },
          ],
        })
        .expect(400);
      await client
        .patch('/users/me/preferences', {
          insightTargets: [
            { fieldId: freeTextFieldId, direction: 'NEUTRAL', value: 'a' },
            {
              fieldId: freeTextFieldId,
              direction: 'LOWER_IS_BETTER',
              value: 'a',
            },
          ],
        })
        .expect(400);
      await client
        .patch('/users/me/preferences', {
          insightTargets: Array.from({ length: 7 }, (_, index) => ({
            fieldId: freeTextFieldId,
            direction: 'NEUTRAL',
            value: `v${index}`,
          })),
        })
        .expect(400);
      expect(await targetsOf()).toHaveLength(3);
    });

    it('should still clear the targets with an empty list', async (): Promise<void> => {
      await client
        .patch('/users/me/preferences', { insightTargets: [] })
        .expect(200);
      expect(await targetsOf()).toEqual([]);
    });
  });

  describe('custom field construct override', () => {
    it('should set the override and go back to automatic with null', async (): Promise<void> => {
      // Act
      const set = await client
        .patch(`/health/custom-fields/${numberFieldId}`, {
          constructOverride: 'anxiety',
        })
        .expect(200);
      const cleared = await client
        .patch(`/health/custom-fields/${numberFieldId}`, {
          constructOverride: null,
        })
        .expect(200);

      // Assert
      expect((set.body as FieldBody).constructOverride).toBe('anxiety');
      expect((cleared.body as FieldBody).constructOverride).toBeUndefined();
    });

    it('should reject a construct outside the closed list', async (): Promise<void> => {
      await client
        .patch(`/health/custom-fields/${numberFieldId}`, {
          constructOverride: 'invented',
        })
        .expect(400);
    });
  });

  describe('patterns endpoints', () => {
    it('should answer not_computed before any computation', async (): Promise<void> => {
      const res = await client.get('/insights/patterns').expect(200);
      expect(res.body).toEqual({ status: 'not_computed' });
    });

    it('should store and remove a verdict on an obvious link', async (): Promise<void> => {
      // Act
      const set = await client
        .post('/insights/patterns/obvious', {
          findingKey: 'poor_sleep|field:x|1|+',
          obvious: true,
        })
        .expect(200);
      const removed = await client
        .post('/insights/patterns/obvious', {
          findingKey: 'poor_sleep|field:x|1|+',
          obvious: null,
        })
        .expect(200);

      // Assert
      expect(set.body).toEqual({
        findingKey: 'poor_sleep|field:x|1|+',
        obvious: true,
      });
      expect(removed.body).toEqual({
        findingKey: 'poor_sleep|field:x|1|+',
        obvious: null,
      });
    });

    it('should reject an empty key and a non-boolean verdict', async (): Promise<void> => {
      await client
        .post('/insights/patterns/obvious', { findingKey: '', obvious: true })
        .expect(400);
      await client
        .post('/insights/patterns/obvious', { findingKey: 'k', obvious: 'yes' })
        .expect(400);
    });

    it('should list the logged values of a text field, most frequent first', async (): Promise<void> => {
      // Arrange
      const days = [
        ['2026-02-01', 'calme'],
        ['2026-02-02', 'agressif'],
        ['2026-02-03', 'calme'],
      ];
      for (const [date, value] of days) {
        await client
          .post('/health/daily-logs/entry', {
            logDate: new Date(`${date}T12:00:00.000Z`).toISOString(),
            values: [{ customFieldId: freeTextFieldId, value }],
          })
          .expect(201);
      }

      // Act
      const res = await client
        .get(`/insights/patterns/field-values?fieldId=${freeTextFieldId}`)
        .expect(200);

      // Assert
      expect(res.body).toEqual({ values: ['calme', 'agressif'] });
    });

    it('should reject a field id that is not a UUID', async (): Promise<void> => {
      await client
        .get('/insights/patterns/field-values?fieldId=nope')
        .expect(400);
    });

    it('should require authentication', async (): Promise<void> => {
      const anonymous = await TestClient.create();
      try {
        await anonymous.get('/insights/patterns').expect(401);
        await anonymous
          .post('/insights/patterns/obvious', {
            findingKey: 'k',
            obvious: true,
          })
          .expect(401);
      } finally {
        await anonymous.close();
      }
    });
  });
});
