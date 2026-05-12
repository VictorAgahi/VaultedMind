import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AbstractBaseRepository } from './base.repository.js';
import { UserModel } from '../models/user.model.js';
import { User } from '../../modules/user/domain/entities/user.entity.js';
import { UserMapper } from '../mappers/user.mapper.js';

@Injectable()
export class UserRepository extends AbstractBaseRepository<UserModel> {
  constructor(
    @InjectRepository(UserModel)
    userRepository: Repository<UserModel>,
    private readonly userMapper: UserMapper,
  ) {
    super(userRepository);
  }

  /**
   * Finds a domain user by email index (blind index).
   */
  async findByEmailIndex(emailIndex: string): Promise<User | null> {
    const model = await this.repository.findOne({ where: { emailIndex } });
    return model ? this.userMapper.toDomain(model) : null;
  }

  /**
   * Specifically for login, includes the password hash.
   */
  async findByEmailIndexWithPassword(emailIndex: string): Promise<User | null> {
    const model = await this.repository.findOne({
      where: { emailIndex },
      select: [
        'id',
        'emailEncrypted',
        'passwordHash',
        'createdAt',
        'updatedAt',
        'deletedAt',
      ],
    });
    return model ? this.userMapper.toDomain(model) : null;
  }

  /**
   * Standard findById returning domain entity.
   */
  async findUserById(id: string): Promise<User> {
    const model = await this.findById(id);
    return this.userMapper.toDomain(model);
  }

  /**
   * Persists a domain user.
   */
  async saveUser(user: User): Promise<User> {
    const model = this.userMapper.toPersistence(user);
    const savedModel = await this.repository.save(model);
    return this.userMapper.toDomain(savedModel);
  }

  /**
   * Hard deletes a user from the database.
   */
  async deleteUser(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
