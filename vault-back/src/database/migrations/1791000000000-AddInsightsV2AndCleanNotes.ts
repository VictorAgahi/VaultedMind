import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInsightsV2AndCleanNotes1791000000000 implements MigrationInterface {
  name = 'AddInsightsV2AndCleanNotes1791000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "insights_v2_enabled" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(`ALTER TABLE "daily_logs" ADD "notes_clean" text`);
    await queryRunner.query(
      `ALTER TABLE "daily_logs" ADD "notes_clean_source" varchar`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "daily_logs" DROP COLUMN "notes_clean_source"`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_logs" DROP COLUMN "notes_clean"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "insights_v2_enabled"`,
    );
  }
}
