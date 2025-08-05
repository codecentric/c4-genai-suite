import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConfigurationIdToMessages1754379840682 implements MigrationInterface {
  name = 'AddConfigurationIdToMessages1754379840682';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "company_chat"."messages" ADD "configurationId" integer`);

    await queryRunner.query(`
        UPDATE "company_chat"."messages" m
        SET "configurationId" = (
            SELECT "configurationId"
            FROM "company_chat"."conversations" c
            WHERE c."id" = m."conversationId"
        )
    `);

    await queryRunner.query(`ALTER TABLE "company_chat"."messages" ALTER COLUMN "configurationId" SET NOT NULL`);

    await queryRunner.query(
      `ALTER TABLE "company_chat"."messages" ADD CONSTRAINT "FK_30684080549b7e451cd571009d7" FOREIGN KEY ("configurationId") REFERENCES "company_chat"."configurations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "company_chat"."messages" DROP CONSTRAINT "FK_30684080549b7e451cd571009d7"`);
    await queryRunner.query(`ALTER TABLE "company_chat"."messages" DROP COLUMN "configurationId"`);
  }
}
