import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from '../application/services/auth.service.js';
import { AuthController } from './controllers/auth.controller.js';
import { TokenService } from '../domain/services/token.service.js';
import { JwtStrategy } from './guards/jwt.strategy.js';
import { UserModule } from '../../user/infrastructure/user.module.js';
import { ApiKeyService } from '../application/services/api-key.service.js';
import { ApiKeyController } from './controllers/api-key.controller.js';
import { ApiKeyGuard } from './guards/api-key.guard.js';

@Module({
  imports: [PassportModule, UserModule],
  providers: [
    AuthService,
    TokenService,
    JwtStrategy,
    ApiKeyService,
    ApiKeyGuard,
  ],
  controllers: [AuthController, ApiKeyController],
  exports: [AuthService, TokenService, ApiKeyService, ApiKeyGuard],
})
export class AuthModule {}
