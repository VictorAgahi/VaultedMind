import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNoteSignalsAndPeople1792000000000 implements MigrationInterface {
  name = 'AddNoteSignalsAndPeople1792000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "people_encrypted" text`);
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "note_signals" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "daily_log_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "bank_version" varchar NOT NULL,
        "source_hash" varchar NOT NULL,
        "payload" text,
        "corrections" text,
        "failure_count" integer NOT NULL DEFAULT 0,
        "last_failure_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_note_signals_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_note_signals_daily_log_id" UNIQUE ("daily_log_id"),
        CONSTRAINT "FK_note_signals_daily_log_id" FOREIGN KEY ("daily_log_id") REFERENCES "daily_logs"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_note_signals_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_note_signals_user_id" ON "note_signals" ("user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "note_signals"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "people_encrypted"`,
    );
  }
}
