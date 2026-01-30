import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditLogTable1769752533473 implements MigrationInterface {
  name = 'AddAuditLogTable1769752533473';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "company_chat"."audit_log" (
        "id" SERIAL NOT NULL,
        "entityType" character varying NOT NULL,
        "entityId" character varying NOT NULL,
        "action" character varying NOT NULL,
        "userId" character varying NOT NULL,
        "userName" character varying,
        "snapshot" jsonb NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_log" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_b35b05c4d0286d7f0e5ec3be83" ON "company_chat"."audit_log" ("entityType") `);
    await queryRunner.query(`CREATE INDEX "IDX_7a09a92c169c7e52e7920f07c8" ON "company_chat"."audit_log" ("entityId") `);
    await queryRunner.query(`CREATE INDEX "IDX_78e013ffae12f5a1fc1dbefff9" ON "company_chat"."audit_log" ("createdAt") `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "company_chat"."IDX_78e013ffae12f5a1fc1dbefff9"`);
    await queryRunner.query(`DROP INDEX "company_chat"."IDX_7a09a92c169c7e52e7920f07c8"`);
    await queryRunner.query(`DROP INDEX "company_chat"."IDX_b35b05c4d0286d7f0e5ec3be83"`);
    await queryRunner.query(`DROP TABLE "company_chat"."audit_log"`);
  }
}
