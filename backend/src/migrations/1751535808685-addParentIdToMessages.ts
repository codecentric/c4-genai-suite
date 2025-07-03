import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddParentIdToMessages1751535808685 implements MigrationInterface {
  name = 'AddParentIdToMessages1751535808685';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "messages" ADD "parentId" integer`);
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_7d473d0de3669832052cac98b98" FOREIGN KEY ("parentId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(`
      CREATE TEMPORARY TABLE message_relationships AS
      WITH ordered_messages AS (
          SELECT 
              id,
              "conversationId",
              -- Use ROW_NUMBER to get the position of each message within its conversation
              ROW_NUMBER() OVER (PARTITION BY "conversationId" ORDER BY id) AS position
          FROM messages
      )
      SELECT 
          current.id,
          previous.id AS "parentId"
      FROM 
          ordered_messages current
      LEFT JOIN 
          ordered_messages previous 
          ON current."conversationId" = previous."conversationId"
          AND current.position = previous.position + 1
      WHERE 
          current.position > 1;
      
      UPDATE messages m
      SET "parentId" = mr."parentId"
      FROM message_relationships mr
      WHERE m.id = mr.id;
      
      DROP TABLE message_relationships;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT "FK_7d473d0de3669832052cac98b98"`);
    await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "parentId"`);
  }
}
