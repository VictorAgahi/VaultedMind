import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubFieldsAndSubValues1786000000000 implements MigrationInterface {
  name = 'AddSubFieldsAndSubValues1786000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "custom_fields" ADD "sub_fields" json`,
    );
    await queryRunner.query(`ALTER TABLE "field_values" ADD "sub_values" json`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "field_values" DROP COLUMN "sub_values"`,
    );
    await queryRunner.query(
      `ALTER TABLE "custom_fields" DROP COLUMN "sub_fields"`,
    );
  }
}
