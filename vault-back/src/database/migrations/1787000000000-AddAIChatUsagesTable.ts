import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAIChatUsagesTable1787000000000 implements MigrationInterface {
  name = 'AddAIChatUsagesTable1787000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "ai_chat_usages" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        "user_id" uuid NOT NULL,
        CONSTRAINT "PK_ai_chat_usages_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_ai_chat_usages_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ai_chat_usages_user_created" ON "ai_chat_usages" ("user_id", "created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_chat_usages"`);
  }
}
