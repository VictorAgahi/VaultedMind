import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAIInsightsTable1778600000000 implements MigrationInterface {
  name = 'AddAIInsightsTable1778600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add ai_insights_enabled column to users
    await queryRunner.query(
      `ALTER TABLE "users" ADD "ai_insights_enabled" boolean NOT NULL DEFAULT false`,
    );

    // Create insight_type enum
    await queryRunner.query(
      `CREATE TYPE "public"."ai_insights_insight_type_enum" AS ENUM('DAILY_SUMMARY', 'WEEKLY_TREND', 'ANOMALY', 'RECOMMENDATION')`,
    );

    // Create ai_insights table
    await queryRunner.query(
      `CREATE TABLE "ai_insights" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "user_id" uuid NOT NULL, "insight_type" "public"."ai_insights_insight_type_enum" NOT NULL, "title" character varying NOT NULL, "content" text NOT NULL, "metadata" json, CONSTRAINT "PK_insights_id" PRIMARY KEY ("id"))`,
    );

    // Add foreign key
    await queryRunner.query(
      `ALTER TABLE "ai_insights" ADD CONSTRAINT "FK_ai_insights_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    // Create index on user_id and created_at for performance
    await queryRunner.query(
      `CREATE INDEX "IDX_ai_insights_user_id_created_at" ON "ai_insights" ("user_id", "created_at" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ai_insights_user_id_created_at"`,
    );

    // Drop foreign key
    await queryRunner.query(
      `ALTER TABLE "ai_insights" DROP CONSTRAINT "FK_ai_insights_user_id"`,
    );

    // Drop ai_insights table
    await queryRunner.query(`DROP TABLE "ai_insights"`);

    // Drop enum
    await queryRunner.query(
      `DROP TYPE "public"."ai_insights_insight_type_enum"`,
    );

    // Drop column
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "ai_insights_enabled"`,
    );
  }
}
