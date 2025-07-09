import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPromptLibrary1751234567890 implements MigrationInterface {
  name = 'AddPromptLibrary1751234567890';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create prompt_categories table
    await queryRunner.query(`
      CREATE TABLE "prompt_categories" (
        "id" SERIAL NOT NULL,
        "name" character varying(100) NOT NULL,
        "description" character varying(500),
        "color" character varying(7),
        "sortOrder" integer NOT NULL DEFAULT '0',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_prompt_categories_name" UNIQUE ("name"),
        CONSTRAINT "PK_prompt_categories" PRIMARY KEY ("id")
      )
    `);

    // Create prompts table
    await queryRunner.query(`
      CREATE TABLE "prompts" (
        "id" SERIAL NOT NULL,
        "title" character varying(200) NOT NULL,
        "content" text NOT NULL,
        "description" character varying(1000),
        "isPublic" boolean NOT NULL DEFAULT true,
        "originalPromptId" integer,
        "usageCount" integer NOT NULL DEFAULT '0',
        "averageRating" numeric(3,2) NOT NULL DEFAULT '0',
        "ratingCount" integer NOT NULL DEFAULT '0',
        "authorId" character varying NOT NULL,
        "categoryId" integer,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_prompts" PRIMARY KEY ("id")
      )
    `);

    // Create prompt_ratings table
    await queryRunner.query(`
      CREATE TABLE "prompt_ratings" (
        "id" SERIAL NOT NULL,
        "rating" integer NOT NULL,
        "comment" character varying(1000),
        "promptId" integer NOT NULL,
        "userId" character varying NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "CHK_prompt_ratings_rating" CHECK ("rating" >= 1 AND "rating" <= 5),
        CONSTRAINT "UQ_prompt_ratings_promptId_userId" UNIQUE ("promptId", "userId"),
        CONSTRAINT "PK_prompt_ratings" PRIMARY KEY ("id")
      )
    `);

    // Create prompt_usages table
    await queryRunner.query(`
      CREATE TABLE "prompt_usages" (
        "id" SERIAL NOT NULL,
        "promptId" integer NOT NULL,
        "userId" character varying NOT NULL,
        "usedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_prompt_usages" PRIMARY KEY ("id")
      )
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "prompts" 
      ADD CONSTRAINT "FK_prompts_authorId" 
      FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "prompts" 
      ADD CONSTRAINT "FK_prompts_categoryId" 
      FOREIGN KEY ("categoryId") REFERENCES "prompt_categories"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "prompts" 
      ADD CONSTRAINT "FK_prompts_originalPromptId" 
      FOREIGN KEY ("originalPromptId") REFERENCES "prompts"("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "prompt_ratings" 
      ADD CONSTRAINT "FK_prompt_ratings_promptId" 
      FOREIGN KEY ("promptId") REFERENCES "prompts"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "prompt_ratings" 
      ADD CONSTRAINT "FK_prompt_ratings_userId" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "prompt_usages" 
      ADD CONSTRAINT "FK_prompt_usages_promptId" 
      FOREIGN KEY ("promptId") REFERENCES "prompts"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "prompt_usages" 
      ADD CONSTRAINT "FK_prompt_usages_userId" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    // Insert default categories
    await queryRunner.query(`
      INSERT INTO "prompt_categories" ("name", "description", "color", "sortOrder") VALUES
      ('General', 'General purpose prompts', '#6B7280', 0),
      ('Design', 'Design and creative prompts', '#8B5CF6', 1),
      ('Development', 'Programming and development prompts', '#10B981', 2),
      ('Writing', 'Content writing and copywriting prompts', '#F59E0B', 3),
      ('Analysis', 'Data analysis and research prompts', '#EF4444', 4),
      ('Business', 'Business and marketing prompts', '#3B82F6', 5),
      ('Education', 'Educational and learning prompts', '#06B6D4', 6)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints first
    await queryRunner.query(`ALTER TABLE "prompt_usages" DROP CONSTRAINT "FK_prompt_usages_userId"`);
    await queryRunner.query(`ALTER TABLE "prompt_usages" DROP CONSTRAINT "FK_prompt_usages_promptId"`);
    await queryRunner.query(`ALTER TABLE "prompt_ratings" DROP CONSTRAINT "FK_prompt_ratings_userId"`);
    await queryRunner.query(`ALTER TABLE "prompt_ratings" DROP CONSTRAINT "FK_prompt_ratings_promptId"`);
    await queryRunner.query(`ALTER TABLE "prompts" DROP CONSTRAINT "FK_prompts_originalPromptId"`);
    await queryRunner.query(`ALTER TABLE "prompts" DROP CONSTRAINT "FK_prompts_categoryId"`);
    await queryRunner.query(`ALTER TABLE "prompts" DROP CONSTRAINT "FK_prompts_authorId"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "prompt_usages"`);
    await queryRunner.query(`DROP TABLE "prompt_ratings"`);
    await queryRunner.query(`DROP TABLE "prompts"`);
    await queryRunner.query(`DROP TABLE "prompt_categories"`);
  }
}
