import {
  Body,
  Controller,
  Get,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard.js';
import type { AuthUser } from '../../../auth/domain/interfaces/auth-user.interface.js';
import { UserService } from '../../application/services/user.service.js';
import { UpdatePreferencesDto } from '../../application/dtos/update-preferences.dto.js';
import type { UserProfile } from '../../application/types/user-profile.types.js';

@Controller('users/me')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async getProfile(@Request() req: { user: AuthUser }): Promise<UserProfile> {
    return this.userService.getProfile(req.user.id);
  }

  @Patch('preferences')
  async updatePreferences(
    @Request() req: { user: AuthUser },
    @Body() dto: UpdatePreferencesDto,
  ): Promise<UserProfile> {
    return this.userService.updatePreferences(req.user.id, dto);
  }
}
