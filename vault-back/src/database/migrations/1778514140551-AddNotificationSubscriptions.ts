import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationSubscriptions1778514140551 implements MigrationInterface {
  name = 'AddNotificationSubscriptions1778514140551';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "notification_subscriptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "endpoint" character varying NOT NULL, "expiration_time" bigint, "keys" jsonb NOT NULL, "user_id" uuid NOT NULL, CONSTRAINT "PK_8cfec5d2a549ff20d1f4e648226" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_subscriptions" ADD CONSTRAINT "FK_565bddc96d2492c5bf99274575e" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notification_subscriptions" DROP CONSTRAINT "FK_565bddc96d2492c5bf99274575e"`,
    );
    await queryRunner.query(`DROP TABLE "notification_subscriptions"`);
  }
}
