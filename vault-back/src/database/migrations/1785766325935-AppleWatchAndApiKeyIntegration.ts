import { MigrationInterface, QueryRunner } from 'typeorm';

export class AppleWatchAndApiKeyIntegration1785766325935 implements MigrationInterface {
  name = 'AppleWatchAndApiKeyIntegration1785766325935';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ai_insights" DROP CONSTRAINT "FK_ai_insights_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ai_insights_user_id_created_at"`,
    );
    await queryRunner.query(
      `CREATE TABLE "api_keys" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "name" character varying NOT NULL, "hashed_key" character varying NOT NULL, "last_used_at" TIMESTAMP, "user_id" uuid NOT NULL, CONSTRAINT "PK_5c8a79801b44bd27b79228e1dad" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."custom_fields_apple_watch_metric_enum" AS ENUM('SLEEP', 'STEPS', 'ACTIVE_CALORIES', 'RESTING_HEART_RATE', 'WATER_CONSUMPTION', 'MINDFULNESS_MINUTES')`,
    );
    await queryRunner.query(
      `ALTER TABLE "custom_fields" ADD "apple_watch_metric" "public"."custom_fields_apple_watch_metric_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."ai_insights_insight_type_enum" RENAME TO "ai_insights_insight_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."ai_insights_insight_type_enum" AS ENUM('DAILY_SUMMARY', 'WEEKLY_TREND', 'MONTHLY_TREND', 'ANOMALY', 'RECOMMENDATION')`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_insights" ALTER COLUMN "insight_type" TYPE "public"."ai_insights_insight_type_enum" USING "insight_type"::"text"::"public"."ai_insights_insight_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."ai_insights_insight_type_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_insights" ADD CONSTRAINT "FK_4b982463f329037b4b7d2b4cde6" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_keys" ADD CONSTRAINT "FK_a3baee01d8408cd3c0f89a9a973" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "api_keys" DROP CONSTRAINT "FK_a3baee01d8408cd3c0f89a9a973"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_insights" DROP CONSTRAINT "FK_4b982463f329037b4b7d2b4cde6"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."ai_insights_insight_type_enum_old" AS ENUM('DAILY_SUMMARY', 'WEEKLY_TREND', 'ANOMALY', 'RECOMMENDATION')`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_insights" ALTER COLUMN "insight_type" TYPE "public"."ai_insights_insight_type_enum_old" USING "insight_type"::"text"::"public"."ai_insights_insight_type_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."ai_insights_insight_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."ai_insights_insight_type_enum_old" RENAME TO "ai_insights_insight_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "custom_fields" DROP COLUMN "apple_watch_metric"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."custom_fields_apple_watch_metric_enum"`,
    );
    await queryRunner.query(`DROP TABLE "api_keys"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_ai_insights_user_id_created_at" ON "ai_insights" ("created_at", "user_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_insights" ADD CONSTRAINT "FK_ai_insights_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
