import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsGeneratingInsightsToUser1779000000001 implements MigrationInterface {
  name = 'AddIsGeneratingInsightsToUser1779000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "is_generating_insights" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "is_generating_insights"`,
    );
  }
}
