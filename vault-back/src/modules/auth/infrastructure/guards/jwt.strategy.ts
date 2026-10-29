import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthService } from '../../application/services/auth.service.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request: Request): string | null => {
          return (request?.cookies?.access_token as string) || null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      algorithms: ['HS256'],
      // Also rejects legacy 180-day tokens once they are older than 7 days
      jsonWebTokenOptions: { maxAge: '7d' },
    });
  }

  async validate(payload: { sub?: unknown; exp?: unknown }): Promise<{
    id: string;
    email: string;
  } | null> {
    // Tokens without expiration are never accepted
    if (typeof payload.sub !== 'string' || typeof payload.exp !== 'number') {
      return null;
    }
    try {
      const user = await this.authService.validateUserById(payload.sub);
      if (!user) return null;
      return { id: user.id, email: user.email };
    } catch {
      return null;
    }
  }
}
