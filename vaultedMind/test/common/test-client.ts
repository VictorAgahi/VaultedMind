import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { Server } from 'http';
import { AppModule } from '../../src/app.module.js';

export class TestClient {
  private app: INestApplication<Server>;
  private accessToken?: string;

  private constructor(app: INestApplication<Server>) {
    this.app = app;
  }

  static async create(): Promise<TestClient> {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleFixture.createNestApplication<Server>();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    await app.init();

    return new TestClient(app as INestApplication<Server>);
  }

  async close(): Promise<void> {
    await this.app.close();
  }

  getHttpServer(): Server {
    return this.app.getHttpServer();
  }

  setToken(token: string): void {
    this.accessToken = token;
  }

  clearToken(): void {
    this.accessToken = undefined;
  }

  post(url: string, body?: object): request.Test {
    const req = request(this.app.getHttpServer()).post(url);
    if (this.accessToken) {
      req.set('Authorization', `Bearer ${this.accessToken}`);
    }
    return body ? req.send(body) : req;
  }

  get(url: string): request.Test {
    const req = request(this.app.getHttpServer()).get(url);
    if (this.accessToken) {
      req.set('Authorization', `Bearer ${this.accessToken}`);
    }
    return req;
  }

  put(url: string, body?: object): request.Test {
    const req = request(this.app.getHttpServer()).put(url);
    if (this.accessToken) {
      req.set('Authorization', `Bearer ${this.accessToken}`);
    }
    return body ? req.send(body) : req;
  }

  patch(url: string, body?: object): request.Test {
    const req = request(this.app.getHttpServer()).patch(url);
    if (this.accessToken) {
      req.set('Authorization', `Bearer ${this.accessToken}`);
    }
    return body ? req.send(body) : req;
  }

  delete(url: string): request.Test {
    const req = request(this.app.getHttpServer()).delete(url);
    if (this.accessToken) {
      req.set('Authorization', `Bearer ${this.accessToken}`);
    }
    return req;
  }
}
