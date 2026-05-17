import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAiContextToUser1779000000000 implements MigrationInterface {
    name = 'AddAiContextToUser1779000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "ai_context" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "ai_context"`);
    }
}
