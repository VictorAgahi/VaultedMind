import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUIFieldsToCustomFields1779000000002 implements MigrationInterface {
  name = 'AddUIFieldsToCustomFields1779000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "custom_fields" ADD "category" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "custom_fields" ADD "remember_last_value" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "custom_fields" ADD "min" double precision`,
    );
    await queryRunner.query(
      `ALTER TABLE "custom_fields" ADD "max" double precision`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "custom_fields" DROP COLUMN "max"`);
    await queryRunner.query(`ALTER TABLE "custom_fields" DROP COLUMN "min"`);
    await queryRunner.query(
      `ALTER TABLE "custom_fields" DROP COLUMN "remember_last_value"`,
    );
    await queryRunner.query(
      `ALTER TABLE "custom_fields" DROP COLUMN "category"`,
    );
  }
}
