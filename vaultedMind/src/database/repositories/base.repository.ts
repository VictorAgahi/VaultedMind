import {
  Repository,
  DeepPartial,
  FindManyOptions,
  FindOneOptions,
  EntityManager,
  ObjectLiteral,
  FindOptionsWhere,
} from 'typeorm';
import {
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { QueryDeepPartialEntity } from 'typeorm';

/**
 * Abstract Base Repository providing standardized generic methods.
 * Encapsulates TypeORM Repository to provide a clean interface.
 */
export abstract class AbstractBaseRepository<T extends ObjectLiteral> {
  protected constructor(protected readonly repository: Repository<T>) {}

  /**
   * Finds an entity by its ID.
   * @param id The UUID of the entity.
   * @throws NotFoundException if the entity does not exist.
   */
  async findById(id: string): Promise<T> {
    const options: FindOneOptions<T> = {
      where: { id } as unknown as FindOptionsWhere<T>,
    };
    const entity = await this.repository.findOne(options);
    if (!entity) {
      throw new NotFoundException(`Entity with ID ${id} not found`);
    }
    return entity;
  }

  /**
   * Finds all entities with pagination support.
   * @param options TypeORM FindManyOptions.
   */
  async findAll(options?: FindManyOptions<T>): Promise<[T[], number]> {
    return this.repository.findAndCount(options);
  }

  /**
   * Creates and saves a new entity.
   * @param data Partial entity data.
   */
  async create(data: DeepPartial<T>): Promise<T> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  /**
   * Updates an existing entity.
   * @param id The UUID of the entity.
   * @param data Partial data to update.
   * @throws NotFoundException if the entity does not exist.
   */
  async update(id: string, data: QueryDeepPartialEntity<T>): Promise<T> {
    const result = await this.repository.update(id, data);
    if (result.affected === 0) {
      throw new NotFoundException(`Entity with ID ${id} not found for update`);
    }
    return this.findById(id);
  }

  /**
   * Soft deletes an entity.
   * @param id The UUID of the entity.
   * @throws NotFoundException if the entity does not exist.
   */
  async softDelete(id: string): Promise<void> {
    const result = await this.repository.softDelete(id);
    if (result.affected === 0) {
      throw new NotFoundException(
        `Entity with ID ${id} not found for deletion`,
      );
    }
  }

  /**
   * Executes a callback within a database transaction.
   * @param work Callback function receiving the EntityManager.
   */
  async executeInTransaction<R>(
    work: (entityManager: EntityManager) => Promise<R>,
  ): Promise<R> {
    const queryRunner = this.repository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await work(queryRunner.manager);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(
        `Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      await queryRunner.release();
    }
  }
}
