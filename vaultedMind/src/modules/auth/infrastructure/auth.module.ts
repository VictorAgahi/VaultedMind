import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from '../application/services/auth.service.js';
import { AuthController } from './controllers/auth.controller.js';
import { TokenService } from '../domain/services/token.service.js';
import { JwtStrategy } from './guards/jwt.strategy.js';
import { UserModule } from '../../user/infrastructure/user.module.js';

@Module({
  imports: [PassportModule, UserModule],
  providers: [AuthService, TokenService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService, TokenService],
})
export class AuthModule {}
