import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '../../../user/domain/entities/user.entity.js';

@Injectable()
export class TokenService {
  constructor(private readonly jwtService: JwtService) {}

  /**
   * Generates an access token aligned with the 7-day session cookie.
   * The email is not put in the payload: JWTs are readable by anyone holding them.
   */
  async generateToken(user: User): Promise<string> {
    const payload = {
      sub: user.id,
    };

    return this.jwtService.signAsync(payload, {
      expiresIn: '7d',
      algorithm: 'HS256',
    });
  }

  /**
   * Verifies a token.
   */
  async verifyToken(token: string): Promise<any> {
    return this.jwtService.verifyAsync(token);
  }
}
