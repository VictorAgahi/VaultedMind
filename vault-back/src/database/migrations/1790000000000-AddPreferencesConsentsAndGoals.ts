import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPreferencesConsentsAndGoals1790000000000 implements MigrationInterface {
  name = 'AddPreferencesConsentsAndGoals1790000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "first_name_encrypted" varchar`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "health_data_consent_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "ai_consent_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "ai_include_notes" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "reminder_enabled" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "reminder_time" varchar(5) NOT NULL DEFAULT '21:00'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "timezone" varchar(64) NOT NULL DEFAULT 'Europe/Paris'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "quick_checkin_field_id" uuid`,
    );
    await queryRunner.query(`ALTER TABLE "users" ADD "last_reminder_on" date`);
    await queryRunner.query(
      `ALTER TABLE "custom_fields" ADD "goal_target" double precision`,
    );
    await queryRunner.query(
      `ALTER TABLE "custom_fields" ADD "goal_direction" varchar(8)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "custom_fields" DROP COLUMN "goal_direction"`,
    );
    await queryRunner.query(
      `ALTER TABLE "custom_fields" DROP COLUMN "goal_target"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "last_reminder_on"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "quick_checkin_field_id"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "timezone"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "reminder_time"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "reminder_enabled"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "ai_include_notes"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "ai_consent_at"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "health_data_consent_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "first_name_encrypted"`,
    );
  }
}
