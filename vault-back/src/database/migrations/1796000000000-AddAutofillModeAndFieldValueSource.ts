import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAutofillModeAndFieldValueSource1796000000000 implements MigrationInterface {
  name = 'AddAutofillModeAndFieldValueSource1796000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "custom_fields" ADD "autofill_mode" varchar(8) NOT NULL DEFAULT 'AUTO'`,
    );
    await queryRunner.query(
      `ALTER TABLE "field_values" ADD "source" varchar(16)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "field_values" DROP COLUMN IF EXISTS "source"`,
    );
    await queryRunner.query(
      `ALTER TABLE "custom_fields" DROP COLUMN IF EXISTS "autofill_mode"`,
    );
  }
}
