import { MigrationInterface, QueryRunner } from 'typeorm';

const NEW_METRICS = ['SLEEP_DEEP', 'SLEEP_REM', 'SLEEP_CORE', 'SLEEP_AWAKE'];

export class AddSleepStageMetrics1798000000000 implements MigrationInterface {
  name = 'AddSleepStageMetrics1798000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const metric of NEW_METRICS) {
      await queryRunner.query(
        `ALTER TYPE "public"."custom_fields_apple_watch_metric_enum" ADD VALUE IF NOT EXISTS '${metric}'`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const removed = NEW_METRICS.map((metric) => `'${metric}'`).join(', ');
    await queryRunner.query(
      `UPDATE "custom_fields" SET "apple_watch_metric" = NULL WHERE "apple_watch_metric" IN (${removed})`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."custom_fields_apple_watch_metric_enum" RENAME TO "custom_fields_apple_watch_metric_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."custom_fields_apple_watch_metric_enum" AS ENUM('SLEEP', 'STEPS', 'ACTIVE_CALORIES', 'RESTING_HEART_RATE', 'WATER_CONSUMPTION', 'MINDFULNESS_MINUTES', 'HEART_RATE_VARIABILITY', 'EXERCISE_MINUTES', 'DAYLIGHT_MINUTES', 'RESPIRATORY_RATE', 'BEDTIME')`,
    );
    await queryRunner.query(
      `ALTER TABLE "custom_fields" ALTER COLUMN "apple_watch_metric" TYPE "public"."custom_fields_apple_watch_metric_enum" USING "apple_watch_metric"::"text"::"public"."custom_fields_apple_watch_metric_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."custom_fields_apple_watch_metric_enum_old"`,
    );
  }
}
