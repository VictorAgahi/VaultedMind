import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFieldConstructsAndObviousOverrides1794000000000 implements MigrationInterface {
  name = 'AddFieldConstructsAndObviousOverrides1794000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "custom_fields" ADD "construct" varchar(40)`,
    );
    await queryRunner.query(
      `ALTER TABLE "custom_fields" ADD "construct_name_hash" varchar(64)`,
    );
    await queryRunner.query(
      `ALTER TABLE "custom_fields" ADD "construct_override" varchar(40)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD "pattern_obvious_overrides" json`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "pattern_obvious_overrides"`,
    );
    await queryRunner.query(
      `ALTER TABLE "custom_fields" DROP COLUMN IF EXISTS "construct_override"`,
    );
    await queryRunner.query(
      `ALTER TABLE "custom_fields" DROP COLUMN IF EXISTS "construct_name_hash"`,
    );
    await queryRunner.query(
      `ALTER TABLE "custom_fields" DROP COLUMN IF EXISTS "construct"`,
    );
  }
}
