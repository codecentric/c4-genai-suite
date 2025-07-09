import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPromptVersioning1751234567892 implements MigrationInterface {
  name = 'AddPromptVersioning1751234567892';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create prompt_versions table
    await queryRunner.query(`
      CREATE TABLE "prompt_versions" (
        "id" SERIAL NOT NULL,
        "prompt_id" integer NOT NULL,
        "version_number" integer NOT NULL,
        "title" character varying(255) NOT NULL,
        "description" text,
        "content" text NOT NULL,
        "category_id" integer,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "created_by" character varying NOT NULL,
        "is_current" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_prompt_versions" PRIMARY KEY ("id")
      )
    `);

    // Add current_version column to prompts table
    await queryRunner.query(`
      ALTER TABLE "prompts" ADD "current_version" integer NOT NULL DEFAULT 1
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "prompt_versions" 
      ADD CONSTRAINT "FK_prompt_versions_prompt_id" 
      FOREIGN KEY ("prompt_id") REFERENCES "prompts"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "prompt_versions" 
      ADD CONSTRAINT "FK_prompt_versions_created_by" 
      FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    // Create initial versions for existing prompts
    await queryRunner.query(`
      INSERT INTO "prompt_versions" (
        "prompt_id", 
        "version_number", 
        "title", 
        "description", 
        "content", 
        "category_id", 
        "created_by", 
        "is_current",
        "created_at"
      )
      SELECT 
        p."id",
        1,
        p."title",
        p."description",
        p."content",
        p."categoryId",
        p."authorId",
        true,
        p."createdAt"
      FROM "prompts" p
    `);

    // Create index for better performance
    await queryRunner.query(`
      CREATE INDEX "IDX_prompt_versions_prompt_id" ON "prompt_versions" ("prompt_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_prompt_versions_is_current" ON "prompt_versions" ("is_current")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_prompt_versions_unique_current" 
      ON "prompt_versions" ("prompt_id") 
      WHERE "is_current" = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_prompt_versions_unique_current"`);
    await queryRunner.query(`DROP INDEX "IDX_prompt_versions_is_current"`);
    await queryRunner.query(`DROP INDEX "IDX_prompt_versions_prompt_id"`);

    // Drop foreign key constraints
    await queryRunner.query(`ALTER TABLE "prompt_versions" DROP CONSTRAINT "FK_prompt_versions_created_by"`);
    await queryRunner.query(`ALTER TABLE "prompt_versions" DROP CONSTRAINT "FK_prompt_versions_prompt_id"`);

    // Drop current_version column
    await queryRunner.query(`ALTER TABLE "prompts" DROP COLUMN "current_version"`);

    // Drop prompt_versions table
    await queryRunner.query(`DROP TABLE "prompt_versions"`);
  }
}
