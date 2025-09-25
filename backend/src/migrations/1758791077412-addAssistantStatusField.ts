import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAssistantStatusField1758791077412 implements MigrationInterface {
  name = 'AddAssistantStatusField1758791077412';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "company_chat"."configurations" RENAME COLUMN "enabled" TO "status"`);

    // Convert boolean to text temporarily for mapping
    await queryRunner.query(`ALTER TABLE "company_chat"."configurations" ALTER COLUMN "status" TYPE text`);
    await queryRunner.query(`UPDATE "company_chat"."configurations" SET "status" = 'enabled' WHERE "status" = 'true'`);
    await queryRunner.query(`UPDATE "company_chat"."configurations" SET "status" = 'disabled' WHERE "status" = 'false'`);

    await queryRunner.query(`CREATE TYPE "company_chat"."configurations_status_enum" AS ENUM('enabled', 'disabled', 'deleted')`);
    await queryRunner.query(
      `ALTER TABLE "company_chat"."configurations" ALTER COLUMN "status" TYPE "company_chat"."configurations_status_enum" USING "status"::"company_chat"."configurations_status_enum"`,
    );

    await queryRunner.query(`ALTER TABLE "company_chat"."configurations" ALTER COLUMN "status" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "company_chat"."configurations" ALTER COLUMN "status" SET DEFAULT 'enabled'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "company_chat"."configurations" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "company_chat"."configurations" ALTER COLUMN "status" TYPE text`);
    await queryRunner.query(`UPDATE "company_chat"."configurations" SET "status" = 'true' WHERE "status" = 'enabled'`);
    await queryRunner.query(
      `UPDATE "company_chat"."configurations" SET "status" = 'false' WHERE "status" = 'disabled' OR "status" = 'deleted'`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_chat"."configurations" ALTER COLUMN "status" TYPE boolean USING ("status" = 'true')`,
    );
    await queryRunner.query(`DROP TYPE "company_chat"."configurations_status_enum"`);
    await queryRunner.query(`ALTER TABLE "company_chat"."configurations" RENAME COLUMN "status" TO "enabled"`);
  }
}
