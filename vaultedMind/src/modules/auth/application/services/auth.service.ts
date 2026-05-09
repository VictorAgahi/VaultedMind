import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { UserService } from '../../../user/application/services/user.service.js';
import { TokenService } from '../../domain/services/token.service.js';
import { EncryptionService } from '../../../../common/security/encryption.service.js';
import { LoginDto, RegisterDto } from '../../application/dtos/auth.dto.js';
import { UserRepository } from '../../../../database/repositories/user.repository.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
    private readonly encryptionService: EncryptionService,
    private readonly userRepository: UserRepository,
  ) {}

  async register(dto: RegisterDto) {
    this.logger.log(`Registering new user with email: ${dto.email}`);
    const user = await this.userService.createUser(dto.email, dto.password);
    const token = await this.tokenService.generateToken(user);
    return { user, token };
  }

  async login(dto: LoginDto) {
    const emailIndex = this.encryptionService.createBlindIndex(dto.email);
    const user =
      await this.userRepository.findByEmailIndexWithPassword(emailIndex);

    if (!user) {
      this.logger.warn(`Login failed: user not found for email index`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.encryptionService.comparePassword(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = await this.tokenService.generateToken(user);
    this.logger.log(`User logged in successfully: ${user.id}`);
    return { user, token };
  }
}
