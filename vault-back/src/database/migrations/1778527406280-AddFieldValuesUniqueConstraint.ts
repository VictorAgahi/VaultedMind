import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFieldValuesUniqueConstraint1778527406280 implements MigrationInterface {
  name = 'AddFieldValuesUniqueConstraint1778527406280';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "daily_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "log_date" date NOT NULL, "notes" text, "user_id" uuid NOT NULL, CONSTRAINT "PK_ea32d6160ba0b85cb14426c50b0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "field_values" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "value" text NOT NULL, "daily_log_id" uuid NOT NULL, "custom_field_id" uuid NOT NULL, CONSTRAINT "UQ_ed7801dd1c11c34d2d7c80328ab" UNIQUE ("daily_log_id", "custom_field_id"), CONSTRAINT "PK_3e99d52ffd8638b4270d275c0d6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."custom_fields_field_type_enum" AS ENUM('STRING', 'NUMBER', 'BOOLEAN', 'DATE')`,
    );
    await queryRunner.query(
      `CREATE TABLE "custom_fields" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "name" character varying NOT NULL, "field_type" "public"."custom_fields_field_type_enum" NOT NULL DEFAULT 'STRING', "is_active" boolean NOT NULL DEFAULT true, "options_order" json, "user_id" uuid NOT NULL, CONSTRAINT "PK_35ab958a0baec2e0b2b2b875fdb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "email_encrypted" character varying NOT NULL, "email_index" character varying NOT NULL, "password_hash" character varying NOT NULL, CONSTRAINT "UQ_9e16815c629283de916d8693fd5" UNIQUE ("email_encrypted"), CONSTRAINT "UQ_498cf712f15452d301a943fd5c6" UNIQUE ("email_index"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "notification_subscriptions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, "endpoint" character varying NOT NULL, "expiration_time" bigint, "keys" jsonb NOT NULL, "user_id" uuid NOT NULL, CONSTRAINT "PK_8cfec5d2a549ff20d1f4e648226" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_logs" ADD CONSTRAINT "FK_28dc684c15a9369be262170f705" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "field_values" ADD CONSTRAINT "FK_4a7f8c116841ff751cc6253553a" FOREIGN KEY ("daily_log_id") REFERENCES "daily_logs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "field_values" ADD CONSTRAINT "FK_42c152234da15aac2e8c878bc2c" FOREIGN KEY ("custom_field_id") REFERENCES "custom_fields"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "custom_fields" ADD CONSTRAINT "FK_00eba82fe8047e44079a824b95b" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notification_subscriptions" ADD CONSTRAINT "FK_565bddc96d2492c5bf99274575e" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notification_subscriptions" DROP CONSTRAINT "FK_565bddc96d2492c5bf99274575e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "custom_fields" DROP CONSTRAINT "FK_00eba82fe8047e44079a824b95b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "field_values" DROP CONSTRAINT "FK_42c152234da15aac2e8c878bc2c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "field_values" DROP CONSTRAINT "FK_4a7f8c116841ff751cc6253553a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_logs" DROP CONSTRAINT "FK_28dc684c15a9369be262170f705"`,
    );
    await queryRunner.query(`DROP TABLE "notification_subscriptions"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "custom_fields"`);
    await queryRunner.query(
      `DROP TYPE "public"."custom_fields_field_type_enum"`,
    );
    await queryRunner.query(`DROP TABLE "field_values"`);
    await queryRunner.query(`DROP TABLE "daily_logs"`);
  }
}
