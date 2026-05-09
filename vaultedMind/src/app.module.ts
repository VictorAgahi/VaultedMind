import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import databaseConfig from './config/database.config.js';
import { DatabaseModule } from './database/database.module.js';
import { SecurityModule } from './common/security/security.module.js';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from './modules/user/infrastructure/user.module.js';
import { AuthModule } from './modules/auth/infrastructure/auth.module.js';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { HealthModule } from './modules/health/infrastructure/health.module.js';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => ({
        ...(configService.get('database') as TypeOrmModuleOptions),
        autoLoadEntities: true,
      }),
    }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('JWT_SECRET') || 'ultra_secret_jwt_key',
        signOptions: { expiresIn: '180d' },
      }),
      global: true,
    }),
    SecurityModule,
    DatabaseModule,
    UserModule,
    AuthModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }
