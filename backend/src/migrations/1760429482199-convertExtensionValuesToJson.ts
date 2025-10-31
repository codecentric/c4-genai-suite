import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConvertExtensionValuesToJson1760429482199 implements MigrationInterface {
  name = 'ConvertExtensionValuesToJson1760429482199';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "company_chat"."extensions" ALTER COLUMN "values" TYPE jsonb USING ("values"::jsonb)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "company_chat"."extensions" ALTER COLUMN "values" TYPE text USING ("values"::text)`);
  }
}
