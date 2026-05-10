import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOptionsOrderToCustomFields1778414706709 implements MigrationInterface {
    name = 'AddOptionsOrderToCustomFields1778414706709'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "custom_fields" ADD "options_order" json`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "custom_fields" DROP COLUMN "options_order"`);
    }

}
