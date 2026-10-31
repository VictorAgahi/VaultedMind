import { MigrationInterface, QueryRunner } from 'typeorm';

const METRICS = [
  'SLEEP',
  'STEPS',
  'ACTIVE_CALORIES',
  'RESTING_HEART_RATE',
  'WATER_CONSUMPTION',
  'MINDFULNESS_MINUTES',
  'HEART_RATE_VARIABILITY',
  'EXERCISE_MINUTES',
  'DAYLIGHT_MINUTES',
  'RESPIRATORY_RATE',
  'BEDTIME',
  'SLEEP_DEEP',
  'SLEEP_REM',
  'SLEEP_CORE',
  'SLEEP_AWAKE',
];

export class AddHealthDailyMetricsAndLinking1799000000000 implements MigrationInterface {
  name = 'AddHealthDailyMetricsAndLinking1799000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const values = METRICS.map((metric) => `'${metric}'`).join(', ');
    await queryRunner.query(
      `CREATE TYPE "public"."health_daily_metrics_metric_enum" AS ENUM(${values})`,
    );
    await queryRunner.query(
      `CREATE TABLE "health_daily_metrics" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "log_date" date NOT NULL, "metric" "public"."health_daily_metrics_metric_enum" NOT NULL, "value" text NOT NULL, "user_id" uuid NOT NULL, CONSTRAINT "UQ_health_daily_metrics_user_date_metric" UNIQUE ("user_id", "log_date", "metric"), CONSTRAINT "PK_health_daily_metrics_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "health_daily_metrics" ADD CONSTRAINT "FK_health_daily_metrics_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "custom_fields" ADD "apple_watch_unit" varchar(8)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "health_metric_decisions_encrypted" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "health_metric_decisions_encrypted"`,
    );
    await queryRunner.query(
      `ALTER TABLE "custom_fields" DROP COLUMN IF EXISTS "apple_watch_unit"`,
    );
    await queryRunner.query(
      `ALTER TABLE "health_daily_metrics" DROP CONSTRAINT "FK_health_daily_metrics_user_id"`,
    );
    await queryRunner.query(`DROP TABLE "health_daily_metrics"`);
    await queryRunner.query(
      `DROP TYPE "public"."health_daily_metrics_metric_enum"`,
    );
  }
}
