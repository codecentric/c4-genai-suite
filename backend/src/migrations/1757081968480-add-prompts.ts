import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPrompts1757081968480 implements MigrationInterface {
  name = 'AddPrompts1757081968480';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "company_chat"."prompt-categories" ("label" character varying NOT NULL, "description" character varying NOT NULL, "creationDate" TIMESTAMP NOT NULL, "visibility" character varying NOT NULL, CONSTRAINT "PK_fcceccb98fc892cc5b3e40c1097" PRIMARY KEY ("label"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "company_chat"."prompts" ("id" SERIAL NOT NULL, "title" character varying, "description" character varying, "content" character varying NOT NULL, "visibility" character varying NOT NULL, "raiting" integer, CONSTRAINT "PK_21f33798862975179e40b216a1d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "company_chat"."prompts_categories_prompt-categories" ("promptsId" integer NOT NULL, "promptCategoriesLabel" character varying NOT NULL, CONSTRAINT "PK_645256b9fc1fe950d6f6e7c3003" PRIMARY KEY ("promptsId", "promptCategoriesLabel"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b38fb3b439a6eea0016e1d5906" ON "company_chat"."prompts_categories_prompt-categories" ("promptsId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6515aea8d350337de0804256c9" ON "company_chat"."prompts_categories_prompt-categories" ("promptCategoriesLabel") `,
    );
    await queryRunner.query(
      `ALTER TABLE "company_chat"."prompts_categories_prompt-categories" ADD CONSTRAINT "FK_b38fb3b439a6eea0016e1d5906a" FOREIGN KEY ("promptsId") REFERENCES "company_chat"."prompts"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_chat"."prompts_categories_prompt-categories" ADD CONSTRAINT "FK_6515aea8d350337de0804256c98" FOREIGN KEY ("promptCategoriesLabel") REFERENCES "company_chat"."prompt-categories"("label") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "company_chat"."prompts_categories_prompt-categories" DROP CONSTRAINT "FK_6515aea8d350337de0804256c98"`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_chat"."prompts_categories_prompt-categories" DROP CONSTRAINT "FK_b38fb3b439a6eea0016e1d5906a"`,
    );
    await queryRunner.query(`DROP INDEX "company_chat"."IDX_6515aea8d350337de0804256c9"`);
    await queryRunner.query(`DROP INDEX "company_chat"."IDX_b38fb3b439a6eea0016e1d5906"`);
    await queryRunner.query(`DROP TABLE "company_chat"."prompts_categories_prompt-categories"`);
    await queryRunner.query(`DROP TABLE "company_chat"."prompts"`);
    await queryRunner.query(`DROP TABLE "company_chat"."prompt-categories"`);
  }
}
