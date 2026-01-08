import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveUserGroupFromUsages1767451199884 implements MigrationInterface {
  name = 'RemoveUserGroupFromUsages1767451199884';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Create a temporary table with merged usage data
    // This merges rows that would become duplicates after removing userGroup
    await queryRunner.query(`
      CREATE TEMP TABLE usages_merged AS
      SELECT
        date,
        "userId",
        counter,
        key,
        "subKey",
        SUM(count) as count
      FROM company_chat.usages
      GROUP BY date, "userId", counter, key, "subKey"
    `);

    // Step 2: Drop the old primary key constraint
    await queryRunner.query(`ALTER TABLE company_chat.usages DROP CONSTRAINT "PK_0acc90e335c519dc4e2140320f1"`);

    // Step 3: Truncate the table and reload with merged data
    await queryRunner.query(`TRUNCATE company_chat.usages`);

    await queryRunner.query(`
      INSERT INTO company_chat.usages (date, "userId", "userGroup", counter, key, "subKey", count)
      SELECT date, "userId", '', counter, key, "subKey", count
      FROM usages_merged
    `);

    // Step 4: Drop the userGroup column
    await queryRunner.query(`ALTER TABLE company_chat.usages DROP COLUMN "userGroup"`);

    // Step 5: Add new primary key constraint without userGroup
    await queryRunner.query(
      `ALTER TABLE company_chat.usages ADD CONSTRAINT "PK_usages_without_group" PRIMARY KEY (date, "userId", counter, key, "subKey")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the new primary key
    await queryRunner.query(`ALTER TABLE company_chat.usages DROP CONSTRAINT "PK_usages_without_group"`);

    // Re-add the userGroup column
    await queryRunner.query(`ALTER TABLE company_chat.usages ADD COLUMN "userGroup" character varying NOT NULL DEFAULT ''`);

    // Restore the original primary key
    await queryRunner.query(
      `ALTER TABLE company_chat.usages ADD CONSTRAINT "PK_0acc90e335c519dc4e2140320f1" PRIMARY KEY (date, "userId", "userGroup", counter, key, "subKey")`,
    );
  }
}
