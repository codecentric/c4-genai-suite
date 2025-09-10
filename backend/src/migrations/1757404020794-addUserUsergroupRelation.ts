import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserUsergroupRelation1757404020794 implements MigrationInterface {
  name = 'AddUserUsergroupRelation1757404020794';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "company_chat"."users_user-groups" (
        "userId" varchar NOT NULL,
        "userGroupId" varchar NOT NULL,
        PRIMARY KEY ("userId", "userGroupId"),
        CONSTRAINT "FK_540eba8c3eeec2f5e3228d9f653" FOREIGN KEY ("userId") REFERENCES "company_chat"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "FK_b663869045bc9079c3c41a047a0" FOREIGN KEY ("userGroupId") REFERENCES "company_chat"."user-groups"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_540eba8c3eeec2f5e3228d9f65" ON "company_chat"."users_user-groups" ("userId") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_b663869045bc9079c3c41a047a" ON "company_chat"."users_user-groups" ("userGroupId") `,
    );
    await queryRunner.query(
      `INSERT INTO "company_chat"."users_user-groups" SELECT "id", "userGroupId" FROM "company_chat"."users" WHERE "userGroupId" IS NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "company_chat"."users" DROP CONSTRAINT IF EXISTS "FK_8b96e0ec79394c7e66bf88a05aa"`);
    await queryRunner.query(`ALTER TABLE "company_chat"."users" DROP COLUMN IF EXISTS "userGroupId"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "company_chat"."users" ADD COLUMN "userGroupId" character varying NULL`);
    await queryRunner.query(
      `UPDATE "company_chat"."users" SET "userGroupId" = COALESCE((SELECT "userGroupId" FROM "company_chat"."users_user-groups" WHERE "userId" = "company_chat"."users"."id" LIMIT 1), 'default')`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_chat"."users" ADD CONSTRAINT "FK_8b96e0ec79394c7e66bf88a05aa" FOREIGN KEY ("userGroupId") REFERENCES "company_chat"."user-groups"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "company_chat"."users_user-groups"`);
  }
}
