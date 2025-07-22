import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueConstraintForUserApiKey1753173977072 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE company_chat.users SET "apiKey" = null WHERE "apiKey" = '' OR "apiKey" in 
      (
        SELECT "apiKey" FROM company_chat.users u WHERE "apiKey" IS NOT NULL GROUP BY "apiKey" having count(*) > 1
      )
    `);
    await queryRunner.query(
      `UPDATE company_chat.users SET "apiKey" = encode(sha256("apiKey"::bytea), 'hex') WHERE "apiKey" IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_chat"."users" ADD CONSTRAINT "UQ_c654b438e89f6e1fbd2828b5d37" UNIQUE NULLS DISTINCT ("apiKey")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "company_chat"."users" DROP CONSTRAINT "UQ_c654b438e89f6e1fbd2828b5d37"`);
  }
}
