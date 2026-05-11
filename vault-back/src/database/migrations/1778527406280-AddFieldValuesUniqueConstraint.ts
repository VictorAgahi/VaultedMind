import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFieldValuesUniqueConstraint1778527406280 implements MigrationInterface {
  name = 'AddFieldValuesUniqueConstraint1778527406280';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Deduplicate field_values before adding the unique constraint
    await queryRunner.query(`
      DELETE FROM "field_values" 
      WHERE id IN (
          SELECT id FROM (
              SELECT id, ROW_NUMBER() OVER (PARTITION BY "daily_log_id", "custom_field_id" ORDER BY "created_at" DESC) as row_num
              FROM "field_values"
          ) t
          WHERE t.row_num > 1
      )
    `);

    await queryRunner.query(
      `ALTER TABLE "field_values" ADD CONSTRAINT "UQ_ed7801dd1c11c34d2d7c80328ab" UNIQUE ("daily_log_id", "custom_field_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "field_values" DROP CONSTRAINT "UQ_ed7801dd1c11c34d2d7c80328ab"`,
    );
  }
}
