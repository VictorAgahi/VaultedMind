import { TestClient } from './common/test-client.js';
import { v4 as uuidv4 } from 'uuid';
import { FieldType } from '../src/modules/health/domain/enums/field-type.enum.js';
import {
  RegisterDto,
  LoginDto,
} from '../src/modules/auth/application/dtos/auth.dto.js';
import {
  CreateCustomFieldDto,
  CustomFieldResponseDto,
} from '../src/modules/health/application/dtos/custom-field.dto.js';
import {
  CreateDailyLogDto,
  DailyLogResponseDto,
} from '../src/modules/health/application/dtos/daily-log.dto.js';
import { SaveFieldValueDto } from '../src/modules/health/application/dtos/field-value.dto.js';

interface ExportResponse {
  exportedAt: string;
  user: {
    email: string;
    createdAt: string;
  };
  customFields: Array<{
    id: string;
    name: string;
    fieldType: FieldType;
    isActive: boolean;
  }>;
  dailyLogs: Array<{
    id: string;
    date: string;
    notes: string;
    values: Array<{
      fieldId: string;
      value: string;
    }>;
  }>;
  notifications: Array<{
    endpoint: string;
    createdAt: string;
  }>;
}

describe('User Account Management (e2e)', () => {
  let client: TestClient;

  beforeAll(async (): Promise<void> => {
    client = await TestClient.create();
  });

  afterAll(async (): Promise<void> => {
    await client.close();
  });

  /**
   * Helper to set up a user with some health data for testing export and deletion.
   */
  async function setupUserWithData() {
    const email = `user-mgmt-${uuidv4()}@example.com`;
    const password = 'Password123!';

    // Register
    const registerDto: RegisterDto = { email, password };
    await client.post('/auth/register', registerDto).expect(201);

    // Login
    const loginDto: LoginDto = { email, password };
    const loginRes = await client.post('/auth/login', loginDto).expect(200);
    client.setAuthCookie(loginRes.header['set-cookie'][0]);

    // Create a Custom Field
    const fieldDto: CreateCustomFieldDto = {
      name: 'Test Field',
      fieldType: FieldType.NUMBER,
    };
    const fieldRes = await client
      .post('/health/custom-fields', fieldDto)
      .expect(201);
    const field = fieldRes.body as unknown as CustomFieldResponseDto;

    // Create a Daily Log
    const logDto: CreateDailyLogDto = {
      logDate: new Date().toISOString(),
      notes: 'Initial notes for export test',
    };
    const logRes = await client.post('/health/daily-logs', logDto).expect(201);
    const log = logRes.body as unknown as DailyLogResponseDto;

    // Add a value to the log
    const valueDto: SaveFieldValueDto = {
      customFieldId: field.id,
      value: '42',
    };
    await client
      .post(`/health/daily-logs/${log.id}/values`, valueDto)
      .expect(201);

    return { email, password, fieldId: field.id, logId: log.id };
  }

  describe('GET /auth/export', () => {
    it('should return 401 if unauthenticated', async () => {
      // Arrange
      client.clearAuthCookie();

      // Act
      const response = await client.get('/auth/export');

      // Assert
      expect(response.status).toBe(401);
    });

    it('should return 401 if token is invalid', async () => {
      // Arrange
      client.setAuthCookie('access_token=invalid-token');

      // Act
      const response = await client.get('/auth/export');

      // Assert
      expect(response.status).toBe(401);
    });

    it('should export all user data in a structured JSON', async () => {
      // Arrange
      const { email } = await setupUserWithData();

      // Act
      const res = await client.get('/auth/export').expect(200);
      const data = res.body as unknown as ExportResponse;

      // Assert
      expect(data).toHaveProperty('exportedAt');
      expect(data.user.email).toBe(email);
      expect(data.customFields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Test Field',
            fieldType: FieldType.NUMBER,
          }),
        ]),
      );
      expect(data.dailyLogs).toHaveLength(1);
      expect(data.dailyLogs[0].notes).toBe('Initial notes for export test');
      expect(data.dailyLogs[0].values).toEqual(
        expect.arrayContaining([expect.objectContaining({ value: '42' })]),
      );
      expect(data).toHaveProperty('notifications');
      expect(Array.isArray(data.notifications)).toBe(true);
    });
  });

  describe('DELETE /auth/account', () => {
    it('should return 401 if unauthenticated', async () => {
      // Arrange
      client.clearAuthCookie();

      // Act
      const response = await client.delete('/auth/account');

      // Assert
      expect(response.status).toBe(401);
    });

    it('should delete the account and cascade delete all data', async () => {
      // Arrange
      const { email, password } = await setupUserWithData();

      // Act
      await client.delete('/auth/account').expect(204);

      // Assert
      // 1. Verify user can no longer login
      const loginDto: LoginDto = { email, password };
      await client.post('/auth/login', loginDto).expect(401);

      // 2. Verify existing session token is no longer valid
      await client.get('/auth/me').expect(401);

      // 3. Verify that the email is now available for a new registration (Hard Delete proof)
      const newRegisterDto: RegisterDto = { email, password };
      await client.post('/auth/register', newRegisterDto).expect(201);
    });
  });
});
