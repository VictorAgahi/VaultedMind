import { TestClient } from './common/test-client.js';
import { v4 as uuidv4 } from 'uuid';
import {
  RegisterDto,
  LoginDto,
} from '../src/modules/auth/application/dtos/auth.dto.js';

interface AuthResponse {
  user: {
    id: string;
    email: string;
  };
  token: string;
}

describe('Authentication (e2e)', () => {
  let client: TestClient;

  beforeAll(async (): Promise<void> => {
    client = await TestClient.create();
  });

  afterAll(async (): Promise<void> => {
    await client.close();
  });

  describe('POST /auth/register', () => {
    it('should register a new user and return a token', async (): Promise<void> => {
      // Arrange
      const registerDto: RegisterDto = {
        email: `register-${uuidv4()}@example.com`,
        password: 'Password123!',
      };

      // Act
      const response = await client
        .post('/auth/register', registerDto)
        .expect(201);
      const body = response.body as AuthResponse;

      // Assert
      expect(body).toHaveProperty('user');
      expect(body.user.email).toBe(registerDto.email);
      expect(body).toHaveProperty('token');
      expect(typeof body.token).toBe('string');
    });

    it('should return 400 for an invalid email format', async (): Promise<void> => {
      // Arrange
      const invalidDto = {
        email: 'not-an-email',
        password: 'Password123!',
      };

      // Act & Assert
      await client.post('/auth/register', invalidDto).expect(400);
    });

    it('should return 400 when email is missing', async (): Promise<void> => {
      // Act & Assert
      await client
        .post('/auth/register', { password: 'Password123!' })
        .expect(400);
    });

    it('should return 409 when email is already taken', async (): Promise<void> => {
      // Arrange
      const email = `duplicate-${uuidv4()}@example.com`;
      await client
        .post('/auth/register', { email, password: 'Password123!' })
        .expect(201);

      // Act & Assert
      await client
        .post('/auth/register', { email, password: 'Password123!' })
        .expect(409);
    });
  });

  describe('POST /auth/login', () => {
    const email = `login-${uuidv4()}@example.com`;
    const password = 'Password123!';

    beforeAll(async (): Promise<void> => {
      await client.post('/auth/register', { email, password }).expect(201);
    });

    it('should login successfully and return a JWT token', async (): Promise<void> => {
      // Arrange
      const loginDto: LoginDto = { email, password };

      // Act
      const response = await client.post('/auth/login', loginDto).expect(200);
      const body = response.body as AuthResponse;

      // Assert
      expect(body).toHaveProperty('token');
      expect(body.user.email).toBe(email);
    });

    it('should return 401 for a wrong password', async (): Promise<void> => {
      // Arrange
      const loginDto: LoginDto = { email, password: 'WrongPassword!' };

      // Act & Assert
      await client.post('/auth/login', loginDto).expect(401);
    });

    it('should return 401 for a non-existent email', async (): Promise<void> => {
      // Arrange
      const loginDto: LoginDto = {
        email: `ghost-${uuidv4()}@example.com`,
        password: 'Password123!',
      };

      // Act & Assert
      await client.post('/auth/login', loginDto).expect(401);
    });
  });
});
