import { TestClient } from './common/test-client.js';
import { v4 as uuidv4 } from 'uuid';
import {
  CreateCustomFieldDto,
  UpdateCustomFieldDto,
  CustomFieldResponseDto,
} from '../src/modules/health/application/dtos/custom-field.dto.js';
import {
  CreateDailyLogDto,
  UpdateDailyLogDto,
  DailyLogResponseDto,
} from '../src/modules/health/application/dtos/daily-log.dto.js';
import {
  SaveFieldValueDto,
  UpdateFieldValueDto,
  FieldValueResponseDto,
} from '../src/modules/health/application/dtos/field-value.dto.js';
import { FieldType } from '../src/modules/health/domain/enums/field-type.enum.js';

async function registerAndLogin(client: TestClient): Promise<string> {
  const email = `health-${uuidv4()}@example.com`;
  const password = 'Password123!';
  await client.post('/auth/register', { email, password, healthDataConsent: true }).expect(201);
  const res = await client.post('/auth/login', { email, password }).expect(200);
  return res.header['set-cookie'][0];
}

describe('Health Tracking — CRUD (e2e)', () => {
  let clientA: TestClient;
  let clientB: TestClient;
  let unauthClient: TestClient;

  beforeAll(async (): Promise<void> => {
    clientA = await TestClient.create();
    clientB = await TestClient.create();
    unauthClient = await TestClient.create();

    const cookieA = await registerAndLogin(clientA);
    clientA.setAuthCookie(cookieA);

    const cookieB = await registerAndLogin(clientB);
    clientB.setAuthCookie(cookieB);
    // unauthClient intentionally has no token
  });

  afterAll(async (): Promise<void> => {
    await Promise.all([clientA.close(), clientB.close(), unauthClient.close()]);
  });

  // ─── Custom Fields ──────────────────────────────────────────────────────────

  describe('Custom Fields', () => {
    let fieldId!: string;

    describe('POST /health/custom-fields', () => {
      it('should create a custom field', async (): Promise<void> => {
        // Arrange
        const dto: CreateCustomFieldDto = {
          name: 'Sleep Quality',
          fieldType: FieldType.NUMBER,
        };

        // Act
        const res = await clientA
          .post('/health/custom-fields', dto)
          .expect(201);
        const body = res.body as CustomFieldResponseDto;

        // Assert
        expect(body).toHaveProperty('id');
        expect(body.name).toBe(dto.name);
        expect(body.fieldType).toBe(dto.fieldType);
        expect(body.isActive).toBe(true);
        fieldId = body.id;
      });

      it('should return 401 when unauthenticated', async (): Promise<void> => {
        // Arrange
        const dto: CreateCustomFieldDto = {
          name: 'Mood',
          fieldType: FieldType.STRING,
        };

        // Act & Assert
        await unauthClient.post('/health/custom-fields', dto).expect(401);
      });

      it('should return 400 for missing required fields', async (): Promise<void> => {
        // Act & Assert
        await clientA
          .post('/health/custom-fields', { name: 'incomplete' })
          .expect(400);
      });
    });

    describe('GET /health/custom-fields', () => {
      it("should list only the authenticated user's own fields", async (): Promise<void> => {
        // Act
        const res = await clientA.get('/health/custom-fields').expect(200);
        const body = res.body as CustomFieldResponseDto[];

        // Assert
        expect(Array.isArray(body)).toBe(true);
        expect(body.length).toBeGreaterThan(0);
        expect(body.some((f) => f.id === fieldId)).toBe(true);
      });

      it('should return 401 when unauthenticated', async (): Promise<void> => {
        await unauthClient.get('/health/custom-fields').expect(401);
      });

      it('should not leak userA fields to userB', async (): Promise<void> => {
        // Act
        const res = await clientB.get('/health/custom-fields').expect(200);
        const body = res.body as CustomFieldResponseDto[];

        // Assert — userB sees none of userA's fields
        expect(body.every((f) => f.id !== fieldId)).toBe(true);
      });
    });

    describe('GET /health/custom-fields/:id', () => {
      it('should retrieve a single custom field by id', async (): Promise<void> => {
        // Act
        const res = await clientA
          .get(`/health/custom-fields/${fieldId}`)
          .expect(200);
        const body = res.body as CustomFieldResponseDto;

        // Assert
        expect(body.id).toBe(fieldId);
        expect(body.name).toBe('Sleep Quality');
      });

      it('should return 404 for a non-existent field', async (): Promise<void> => {
        await clientA.get(`/health/custom-fields/${uuidv4()}`).expect(404);
      });
    });

    describe('PATCH /health/custom-fields/:id', () => {
      it("should update a custom field's name", async (): Promise<void> => {
        // Arrange
        const dto: UpdateCustomFieldDto = { name: 'Sleep Score' };

        // Act
        const res = await clientA
          .patch(`/health/custom-fields/${fieldId}`, dto)
          .expect(200);
        const body = res.body as CustomFieldResponseDto;

        // Assert
        expect(body.name).toBe('Sleep Score');
        expect(body.id).toBe(fieldId);
      });

      it("should return 403 when userB tries to update userA's field", async (): Promise<void> => {
        // Arrange
        const dto: UpdateCustomFieldDto = { name: 'Hacked' };

        // Act & Assert
        await clientB
          .patch(`/health/custom-fields/${fieldId}`, dto)
          .expect(403);
      });

      it('should return 401 when unauthenticated', async (): Promise<void> => {
        await unauthClient
          .patch(`/health/custom-fields/${fieldId}`, { name: 'X' })
          .expect(401);
      });
    });

    describe('DELETE /health/custom-fields/:id', () => {
      it("should return 403 when userB tries to delete userA's field", async (): Promise<void> => {
        await clientB.delete(`/health/custom-fields/${fieldId}`).expect(403);
      });

      it('should return 401 when unauthenticated', async (): Promise<void> => {
        await unauthClient
          .delete(`/health/custom-fields/${fieldId}`)
          .expect(401);
      });

      it('should delete the custom field as owner', async (): Promise<void> => {
        // Act
        await clientA.delete(`/health/custom-fields/${fieldId}`).expect(204);

        // Assert — resource is gone
        await clientA.get(`/health/custom-fields/${fieldId}`).expect(404);
      });
    });

    // ─── Daily Logs ─────────────────────────────────────────────────────────────

    describe('Daily Logs', () => {
      let logId!: string;

      describe('POST /health/daily-logs', () => {
        it('should create a daily log', async (): Promise<void> => {
          // Arrange
          const dto: CreateDailyLogDto = {
            logDate: new Date().toISOString(),
            notes: 'Productive day',
          };

          // Act
          const res = await clientA.post('/health/daily-logs', dto).expect(201);
          const body = res.body as DailyLogResponseDto;

          // Assert
          expect(body).toHaveProperty('id');
          expect(body.notes).toBe('Productive day');
          expect(body.notesClean).toBeNull();
          logId = body.id;
        });

        it('should return 401 when unauthenticated', async (): Promise<void> => {
          const dto: CreateDailyLogDto = { logDate: new Date().toISOString() };
          await unauthClient.post('/health/daily-logs', dto).expect(401);
        });

        it('should return 400 for missing logDate', async (): Promise<void> => {
          await clientA
            .post('/health/daily-logs', { notes: 'no date' })
            .expect(400);
        });
      });

      describe('GET /health/daily-logs', () => {
        it("should list authenticated user's daily logs", async (): Promise<void> => {
          // Act
          const res = await clientA.get('/health/daily-logs').expect(200);
          const body = res.body as DailyLogResponseDto[];

          // Assert
          expect(Array.isArray(body)).toBe(true);
          expect(body.some((l) => l.id === logId)).toBe(true);
        });

        it('should not leak userA logs to userB', async (): Promise<void> => {
          const res = await clientB.get('/health/daily-logs').expect(200);
          const body = res.body as DailyLogResponseDto[];
          expect(body.every((l) => l.id !== logId)).toBe(true);
        });
      });

      describe('GET /health/daily-logs/:id', () => {
        it('should retrieve a daily log by id', async (): Promise<void> => {
          const res = await clientA
            .get(`/health/daily-logs/${logId}`)
            .expect(200);
          const body = res.body as DailyLogResponseDto;
          expect(body.id).toBe(logId);
        });

        it('should return 404 for a non-existent log', async (): Promise<void> => {
          await clientA.get(`/health/daily-logs/${uuidv4()}`).expect(404);
        });
      });

      describe('PATCH /health/daily-logs/:id', () => {
        it('should update the notes of a daily log', async (): Promise<void> => {
          // Arrange
          const dto: UpdateDailyLogDto = { notes: 'Updated notes' };

          // Act
          const res = await clientA
            .patch(`/health/daily-logs/${logId}`, dto)
            .expect(200);
          const body = res.body as DailyLogResponseDto;

          // Assert
          expect(body.notes).toBe('Updated notes');
        });

        it("should return 403 when userB tries to update userA's log", async (): Promise<void> => {
          await clientB
            .patch(`/health/daily-logs/${logId}`, { notes: 'hack' })
            .expect(403);
        });

        it('should return 401 when unauthenticated', async (): Promise<void> => {
          await unauthClient
            .patch(`/health/daily-logs/${logId}`, { notes: 'x' })
            .expect(401);
        });
      });

      describe('DELETE /health/daily-logs/:id', () => {
        it("should return 403 when userB tries to delete userA's log", async (): Promise<void> => {
          await clientB.delete(`/health/daily-logs/${logId}`).expect(403);
        });

        it('should delete the daily log as owner', async (): Promise<void> => {
          await clientA.delete(`/health/daily-logs/${logId}`).expect(204);
          await clientA.get(`/health/daily-logs/${logId}`).expect(404);
        });
      });
    });

    // ─── Field Values ────────────────────────────────────────────────────────────

    describe('Field Values', () => {
      let fieldId!: string;
      let logId!: string;
      let valueId!: string;

      beforeAll(async (): Promise<void> => {
        // Arrange: create a custom field and a daily log for userA
        const fieldRes = await clientA
          .post('/health/custom-fields', {
            name: 'Energy Level',
            fieldType: FieldType.NUMBER,
          })
          .expect(201);
        fieldId = (fieldRes.body as CustomFieldResponseDto).id;

        const logRes = await clientA
          .post('/health/daily-logs', { logDate: new Date().toISOString() })
          .expect(201);
        logId = (logRes.body as DailyLogResponseDto).id;
      });

      describe('POST /health/daily-logs/:logId/values', () => {
        it('should save a field value to a daily log', async (): Promise<void> => {
          // Arrange
          const dto: SaveFieldValueDto = {
            customFieldId: fieldId,
            value: '8',
          };

          // Act
          const res = await clientA
            .post(`/health/daily-logs/${logId}/values`, dto)
            .expect(201);
          const body = res.body as FieldValueResponseDto;

          // Assert
          expect(body.value).toBe('8');
          expect(body.customFieldId).toBe(fieldId);
          expect(body.dailyLogId).toBe(logId);
          valueId = body.id;
        });

        it('should return 401 when unauthenticated', async (): Promise<void> => {
          const dto: SaveFieldValueDto = { customFieldId: fieldId, value: '5' };
          await unauthClient
            .post(`/health/daily-logs/${logId}/values`, dto)
            .expect(401);
        });

        it('should return 400 when customFieldId is not a UUID', async (): Promise<void> => {
          await clientA
            .post(`/health/daily-logs/${logId}/values`, {
              customFieldId: 'not-a-uuid',
              value: '5',
            })
            .expect(400);
        });
      });

      describe('GET /health/daily-logs/:logId/values', () => {
        it('should list field values for a daily log', async (): Promise<void> => {
          const res = await clientA
            .get(`/health/daily-logs/${logId}/values`)
            .expect(200);
          const body = res.body as FieldValueResponseDto[];

          expect(Array.isArray(body)).toBe(true);
          expect(body.some((v) => v.id === valueId)).toBe(true);
        });
      });

      describe('PATCH /health/daily-logs/:logId/values/:valueId', () => {
        it('should update a field value', async (): Promise<void> => {
          // Arrange
          const dto: UpdateFieldValueDto = { value: '10' };

          // Act
          const res = await clientA
            .patch(`/health/daily-logs/${logId}/values/${valueId}`, dto)
            .expect(200);
          const body = res.body as FieldValueResponseDto;

          // Assert
          expect(body.value).toBe('10');
        });

        it("should return 403 when userB tries to update userA's value", async (): Promise<void> => {
          await clientB
            .patch(`/health/daily-logs/${logId}/values/${valueId}`, {
              value: '0',
            })
            .expect(403);
        });

        it('should return 401 when unauthenticated', async (): Promise<void> => {
          await unauthClient
            .patch(`/health/daily-logs/${logId}/values/${valueId}`, {
              value: '0',
            })
            .expect(401);
        });
      });

      describe('DELETE /health/daily-logs/:logId/values/:valueId', () => {
        it("should return 403 when userB tries to delete userA's value", async (): Promise<void> => {
          await clientB
            .delete(`/health/daily-logs/${logId}/values/${valueId}`)
            .expect(403);
        });

        it('should return 401 when unauthenticated', async (): Promise<void> => {
          await unauthClient
            .delete(`/health/daily-logs/${logId}/values/${valueId}`)
            .expect(401);
        });

        it('should delete the field value as owner', async (): Promise<void> => {
          // Act
          await clientA
            .delete(`/health/daily-logs/${logId}/values/${valueId}`)
            .expect(204);

          // Assert — value no longer in list
          const res = await clientA
            .get(`/health/daily-logs/${logId}/values`)
            .expect(200);
          const body = res.body as FieldValueResponseDto[];
          expect(body.every((v) => v.id !== valueId)).toBe(true);
        });
      });
    });
  });

  // ─── Daily entry (atomic save) and preferences ─────────────────────────────

  describe('POST /health/daily-logs/entry', () => {
    let moodFieldId: string;
    let sleepFieldId: string;

    beforeAll(async (): Promise<void> => {
      const mood = await clientA
        .post('/health/custom-fields', {
          name: 'Humeur entrée',
          fieldType: FieldType.NUMBER,
          min: 1,
          max: 10,
          goalTarget: 7,
          goalDirection: 'AT_LEAST',
        })
        .expect(201);
      moodFieldId = (mood.body as CustomFieldResponseDto).id;
      const sleep = await clientA
        .post('/health/custom-fields', {
          name: 'Sommeil entrée',
          fieldType: FieldType.NUMBER,
        })
        .expect(201);
      sleepFieldId = (sleep.body as CustomFieldResponseDto).id;
    });

    it('should persist the field goal', async (): Promise<void> => {
      // Act
      const res = await clientA.get('/health/custom-fields').expect(200);
      const field = (res.body as CustomFieldResponseDto[]).find(
        (f) => f.id === moodFieldId,
      );

      // Assert
      expect(field?.goalTarget).toBe(7);
      expect(field?.goalDirection).toBe('AT_LEAST');
    });

    it('should save a whole day in one request', async (): Promise<void> => {
      // Arrange
      const entry = {
        logDate: '2026-03-10',
        notes: 'Journée calme',
        values: [
          { customFieldId: moodFieldId, value: '7' },
          { customFieldId: sleepFieldId, value: '7.5' },
        ],
      };

      // Act
      const res = await clientA
        .post('/health/daily-logs/entry', entry)
        .expect(201);
      const body = res.body as DailyLogResponseDto;

      // Assert
      expect(body.notes).toBe('Journée calme');
      expect(body.fieldValues).toHaveLength(2);
    });

    it('should update the same day instead of creating a duplicate, and remove cleared values', async (): Promise<void> => {
      // Arrange
      const entry = {
        logDate: '2026-03-10',
        notes: '',
        values: [{ customFieldId: moodFieldId, value: '8' }],
        clearedFieldIds: [sleepFieldId],
      };

      // Act
      await clientA.post('/health/daily-logs/entry', entry).expect(201);
      const res = await clientA.get('/health/daily-logs').expect(200);
      const sameDay = (res.body as DailyLogResponseDto[]).filter((log) =>
        new Date(log.logDate).toISOString().startsWith('2026-03-10'),
      );

      // Assert
      expect(sameDay).toHaveLength(1);
      expect(sameDay[0].fieldValues).toHaveLength(1);
      expect(sameDay[0].fieldValues?.[0].value).toBe('8');
      expect(sameDay[0].notes ?? '').toBe('');
    });

    it("should return 403 when saving values on another user's field", async (): Promise<void> => {
      // Arrange
      const entry = {
        logDate: '2026-03-11',
        values: [{ customFieldId: moodFieldId, value: '5' }],
      };

      // Act & Assert
      await clientB.post('/health/daily-logs/entry', entry).expect(403);
    });

    it('should return 401 when unauthenticated', async (): Promise<void> => {
      await unauthClient
        .post('/health/daily-logs/entry', { logDate: '2026-03-12', values: [] })
        .expect(401);
    });
  });

  describe('PATCH /users/me/preferences', () => {
    it('should update reminder preferences and expose them on /auth/me', async (): Promise<void> => {
      // Arrange
      const update = {
        firstName: 'Alex',
        reminderTime: '20:30',
        timezone: 'Europe/Brussels',
        reminderEnabled: false,
      };

      // Act
      await clientA.patch('/users/me/preferences', update).expect(200);
      const res = await clientA.get('/auth/me').expect(200);
      const body = res.body as {
        firstName?: string;
        preferences: { reminderTime: string; timezone: string; reminderEnabled: boolean };
      };

      // Assert
      expect(body.firstName).toBe('Alex');
      expect(body.preferences).toMatchObject({
        reminderTime: '20:30',
        timezone: 'Europe/Brussels',
        reminderEnabled: false,
      });
    });

    it('should reject a reminder time outside quarter-hour slots', async (): Promise<void> => {
      await clientA
        .patch('/users/me/preferences', { reminderTime: '20:07' })
        .expect(400);
    });

    it('should reject an unknown time zone', async (): Promise<void> => {
      await clientA
        .patch('/users/me/preferences', { timezone: 'Mars/Olympus' })
        .expect(400);
    });
  });

  describe('AI consent', () => {
    it('should refuse to enable AI without consent', async (): Promise<void> => {
      await clientA.post('/health/ai-insights/enable', {}).expect(403);
    });

    it('should enable AI with explicit consent and record it', async (): Promise<void> => {
      // Act
      await clientA
        .post('/health/ai-insights/enable', { consent: true, includeNotes: false })
        .expect(201);
      const res = await clientA.get('/auth/me').expect(200);
      const body = res.body as {
        aiInsightsEnabled: boolean;
        consents: { aiConsentAt?: string };
        preferences: { aiIncludeNotes: boolean };
      };

      // Assert
      expect(body.aiInsightsEnabled).toBe(true);
      expect(body.consents.aiConsentAt).toBeDefined();
      expect(body.preferences.aiIncludeNotes).toBe(false);
    });
  });
});
