import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPatternReportsAndInsightTargets1793000000000 implements MigrationInterface {
  name = 'AddPatternReportsAndInsightTargets1793000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "insight_targets" json`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "pattern_reports" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "user_id" uuid NOT NULL,
        "engine_version" varchar NOT NULL,
        "computed_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "payload" text NOT NULL,
        CONSTRAINT "PK_pattern_reports_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_pattern_reports_user_id" UNIQUE ("user_id"),
        CONSTRAINT "FK_pattern_reports_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "pattern_reports"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "insight_targets"`,
    );
  }
}
