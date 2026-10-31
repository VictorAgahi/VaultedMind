import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTrackedSubjectAndCustomSignals1795000000000 implements MigrationInterface {
  name = 'AddTrackedSubjectAndCustomSignals1795000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "tracked_subject_encrypted" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "custom_signals_encrypted" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "custom_signals_encrypted"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "tracked_subject_encrypted"`,
    );
  }
}
