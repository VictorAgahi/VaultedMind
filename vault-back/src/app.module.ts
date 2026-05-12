import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import databaseConfig from './config/database.config.js';
import { DatabaseModule } from './database/database.module.js';
import { SecurityModule } from './common/security/security.module.js';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from './modules/user/infrastructure/user.module.js';
import { AuthModule } from './modules/auth/infrastructure/auth.module.js';
import { ThrottlerModule } from '@nestjs/throttler';
import { CustomThrottlerGuard } from './common/guards/custom-throttler.guard.js';
import { HealthModule } from './modules/health/infrastructure/health.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { AIInsightsModule } from './modules/ai-insights/infrastructure/ai-insights.module.js';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ScheduleModule.forRoot(),
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
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
      global: true,
    }),
    SecurityModule,
    DatabaseModule,
    UserModule,
    AuthModule,
    HealthModule,
    NotificationsModule,
    AIInsightsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
export class AppModule {}
