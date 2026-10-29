import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddKindToAIChatUsages1788000000000 implements MigrationInterface {
  name = 'AddKindToAIChatUsages1788000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ai_chat_usages" ADD COLUMN IF NOT EXISTS "kind" varchar(32) NOT NULL DEFAULT 'chat'`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ai_chat_usages_user_kind_created" ON "ai_chat_usages" ("user_id", "kind", "created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_ai_chat_usages_user_kind_created"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_chat_usages" DROP COLUMN IF EXISTS "kind"`,
    );
  }
}
