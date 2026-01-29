import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditLogTable1769000000000 implements MigrationInterface {
  name = 'AddAuditLogTable1769000000000';

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
    await queryRunner.query(`CREATE INDEX "IDX_audit_log_entityType" ON "company_chat"."audit_log" ("entityType")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_log_entityId" ON "company_chat"."audit_log" ("entityId")`);
    await queryRunner.query(`CREATE INDEX "IDX_audit_log_createdAt" ON "company_chat"."audit_log" ("createdAt")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "company_chat"."IDX_audit_log_createdAt"`);
    await queryRunner.query(`DROP INDEX "company_chat"."IDX_audit_log_entityId"`);
    await queryRunner.query(`DROP INDEX "company_chat"."IDX_audit_log_entityType"`);
    await queryRunner.query(`DROP TABLE "company_chat"."audit_log"`);
  }
}
