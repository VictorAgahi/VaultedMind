import { Injectable, ConflictException, Logger } from '@nestjs/common';
import { UserRepository } from '../../../../database/repositories/user.repository.js';
import { User } from '../../domain/entities/user.entity.js';
import { EncryptionService } from '../../../../common/security/encryption.service.js';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly encryptionService: EncryptionService,
  ) {}

  async createUser(email: string, password: string): Promise<User> {
    const emailIndex = this.encryptionService.createBlindIndex(email);
    const existingUser = await this.userRepository.findByEmailIndex(emailIndex);

    if (existingUser) {
      this.logger.warn(`User creation failed: email already exists`);
      throw new ConflictException('User already exists');
    }

    const passwordHash = await this.encryptionService.hashPassword(password);

    const user = new User(
      uuidv4(),
      email,
      passwordHash,
      new Date(),
      new Date(),
    );

    const savedUser = await this.userRepository.saveUser(user);
    this.logger.log(`User created successfully with ID: ${savedUser.id}`);
    return savedUser;
  }
}
