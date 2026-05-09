import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckController } from './health-check.controller.js';

describe('HealthCheckController', () => {
  let controller: HealthCheckController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthCheckController],
    }).compile();

    controller = module.get<HealthCheckController>(HealthCheckController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should return ok status', () => {
      const result = controller.check();

      expect(result).toEqual({ status: 'ok' });
    });

    it('should always return ok', () => {
      for (let i = 0; i < 5; i++) {
        const result = controller.check();
        expect(result.status).toBe('ok');
      }
    });
  });
});
