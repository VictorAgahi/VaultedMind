import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import databaseConfig from './config/database.config';
import { DatabaseModule } from './database/database.module';
import { SecurityModule } from './common/security/security.module';
import { JwtModule } from '@nestjs/jwt';
import { UserModule } from './modules/user/infrastructure/user.module';
import { AuthModule } from './modules/auth/infrastructure/auth.module';
import { HealthModule } from './modules/health/infrastructure/health.module';

@Module({
  imports: [
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
})
export class AppModule { }
