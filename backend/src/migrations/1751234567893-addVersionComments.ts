import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVersionComments1751234567893 implements MigrationInterface {
  name = 'AddVersionComments1751234567893';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add version_comment column to prompt_versions table
    await queryRunner.query(`
      ALTER TABLE "prompt_versions" 
      ADD COLUMN "version_comment" TEXT NOT NULL DEFAULT 'Erste Version'
    `);

    // Update existing versions with meaningful default comments
    await queryRunner.query(`
      UPDATE "prompt_versions" 
      SET "version_comment" = 'Erste Version' 
      WHERE "version_number" = 1
    `);

    await queryRunner.query(`
      UPDATE "prompt_versions" 
      SET "version_comment" = 'Aktualisierung' 
      WHERE "version_number" > 1
    `);

    // Remove the default constraint after setting initial values
    await queryRunner.query(`
      ALTER TABLE "prompt_versions" 
      ALTER COLUMN "version_comment" DROP DEFAULT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop version_comment column
    await queryRunner.query(`
      ALTER TABLE "prompt_versions" 
      DROP COLUMN "version_comment"
    `);
  }
}
