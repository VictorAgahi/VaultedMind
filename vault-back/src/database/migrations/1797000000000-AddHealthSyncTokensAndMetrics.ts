import { MigrationInterface, QueryRunner } from 'typeorm';

const NEW_METRICS = [
  'HEART_RATE_VARIABILITY',
  'EXERCISE_MINUTES',
  'DAYLIGHT_MINUTES',
  'RESPIRATORY_RATE',
  'BEDTIME',
];

export class AddHealthSyncTokensAndMetrics1797000000000 implements MigrationInterface {
  name = 'AddHealthSyncTokensAndMetrics1797000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const metric of NEW_METRICS) {
      await queryRunner.query(
        `ALTER TYPE "public"."custom_fields_apple_watch_metric_enum" ADD VALUE IF NOT EXISTS '${metric}'`,
      );
    }
    await queryRunner.query(
      `CREATE TABLE "health_sync_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "token_hash" varchar(64) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "used_at" TIMESTAMP WITH TIME ZONE, "user_id" uuid NOT NULL, CONSTRAINT "PK_health_sync_tokens_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_health_sync_tokens_token_hash" ON "health_sync_tokens" ("token_hash")`,
    );
    await queryRunner.query(
      `ALTER TABLE "health_sync_tokens" ADD CONSTRAINT "FK_health_sync_tokens_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "health_sync_tokens" DROP CONSTRAINT "FK_health_sync_tokens_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_health_sync_tokens_token_hash"`,
    );
    await queryRunner.query(`DROP TABLE "health_sync_tokens"`);

    const removed = NEW_METRICS.map((metric) => `'${metric}'`).join(', ');
    await queryRunner.query(
      `DELETE FROM "field_values" WHERE "custom_field_id" IN (SELECT "id" FROM "custom_fields" WHERE "apple_watch_metric" IN (${removed}))`,
    );
    await queryRunner.query(
      `DELETE FROM "custom_fields" WHERE "apple_watch_metric" IN (${removed})`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."custom_fields_apple_watch_metric_enum" RENAME TO "custom_fields_apple_watch_metric_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."custom_fields_apple_watch_metric_enum" AS ENUM('SLEEP', 'STEPS', 'ACTIVE_CALORIES', 'RESTING_HEART_RATE', 'WATER_CONSUMPTION', 'MINDFULNESS_MINUTES')`,
    );
    await queryRunner.query(
      `ALTER TABLE "custom_fields" ALTER COLUMN "apple_watch_metric" TYPE "public"."custom_fields_apple_watch_metric_enum" USING "apple_watch_metric"::"text"::"public"."custom_fields_apple_watch_metric_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."custom_fields_apple_watch_metric_enum_old"`,
    );
  }
}
