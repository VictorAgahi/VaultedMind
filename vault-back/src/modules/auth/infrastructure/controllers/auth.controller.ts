import {
  Controller,
  Post,
  Body,
  Get,
  Request,
  HttpCode,
  HttpStatus,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from '../../application/services/auth.service.js';
import { LoginDto, RegisterDto } from '../../application/dtos/auth.dto.js';
import { Public } from '../../../../common/decorators/public.decorator.js';
import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import { Throttle, SkipThrottle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Public()
  @SkipThrottle({ default: process.env.NODE_ENV === 'test' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { user, token } = await this.authService.register(dto);
    this.setCookie(response, token);
    return { user };
  }

  @Public()
  @SkipThrottle({ default: process.env.NODE_ENV === 'test' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { user, token } = await this.authService.login(dto);
    this.setCookie(response, token);
    return { user };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) response: Response) {
    const domain = process.env.COOKIE_DOMAIN || undefined;
    response.clearCookie('access_token', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      domain: domain,
    });
    return { message: 'Logged out successfully' };
  }

  private setCookie(response: Response, token: string) {
    const domain = process.env.COOKIE_DOMAIN || undefined;
    response.cookie('access_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
      domain: domain,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Request() req: { user: { id: string; email: string } }): {
    id: string;
    email: string;
  } {
    return req.user;
  }
}
