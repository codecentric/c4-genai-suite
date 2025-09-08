import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserMultiGroupMigration1694188800000 implements MigrationInterface {
  name = 'UserMultiGroupMigration1694188800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove old foreign key and column
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "FK_user_userGroup"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "userGroupId"`);

    // Create join table for many-to-many user-group relation
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_user_groups" (
        "userId" varchar NOT NULL,
        "userGroupId" varchar NOT NULL,
        PRIMARY KEY ("userId", "userGroupId"),
        CONSTRAINT "FK_user_user_groups_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_user_groups_group" FOREIGN KEY ("userGroupId") REFERENCES "user-groups"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop join table
    await queryRunner.query(`DROP TABLE IF EXISTS "user_user_groups"`);
    // Re-add userGroupId column (nullable for backward compatibility)
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN "userGroupId" varchar NULL`);
    // Optionally, re-add the foreign key constraint if needed
    // await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_user_userGroup" FOREIGN KEY ("userGroupId") REFERENCES "user-groups"("id") ON DELETE NO ACTION`);
  }
}
