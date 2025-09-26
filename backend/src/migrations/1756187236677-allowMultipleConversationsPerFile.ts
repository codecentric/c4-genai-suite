import { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowMultipleConversationsPerFile1756187236677 implements MigrationInterface {
  name = 'AllowMultipleConversationsPerFile1756187236677';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "company_chat"."files" DROP CONSTRAINT "FK_d793e035119090188909fa6559a"`);
    await queryRunner.query(
      `CREATE TABLE "company_chat"."conversations_files" ("id" SERIAL NOT NULL, "conversationId" integer NOT NULL, "fileId" integer NOT NULL, "messageId" integer, CONSTRAINT "UQ_04bee2f4651bdcefa29d7cebaaf" UNIQUE ("conversationId", "fileId"), CONSTRAINT "PK_6c9cc57ee46930980a93bed82d6" PRIMARY KEY ("id"))`,
    );

    await queryRunner.query(`
      DROP TRIGGER set_default_doc_id_trigger ON company_chat.files;
      DROP FUNCTION company_chat.set_default_doc_id();
    `);

    await queryRunner.query(`
        INSERT INTO company_chat.files (id, "mimeType", "fileSize", "fileName", "userId", "bucketId", "createdAt",
                                        "updatedAt", "conversationId", "uploadStatus", "extensionId", "docId")
        SELECT
            "docId" as "id",
            "mimeType",
            "fileSize",
            "fileName",
            "userId",
            "bucketId",
            "createdAt",
            "updatedAt",
            "conversationId",
            "uploadStatus",
            "extensionId",
            "docId"
        FROM company_chat.files
        WHERE "docId" IN (SELECT o."docId"
                          FROM company_chat.files o
                          LEFT JOIN company_chat.files j on o."docId" = j.id
                          WHERE j."id" is null)
    `);

    await queryRunner.query(`
      INSERT INTO company_chat.conversations_files("fileId", "conversationId", "messageId")
      SELECT DISTINCT f."docId", f."conversationId", MAX(m.id) FROM company_chat.files f
      LEFT JOIN company_chat.messages m ON m."conversationId" = f."conversationId" AND f."createdAt" <= m."createdAt" AND m."type" = 'human'
      WHERE f."conversationId" IS NOT NULL
      GROUP BY f."docId", f."conversationId";

      DELETE from company_chat.files where "id" <> "docId";
    `);

    await queryRunner.query(`ALTER TABLE "company_chat"."files" DROP COLUMN "conversationId"`);
    await queryRunner.query(`ALTER TABLE "company_chat"."files" DROP COLUMN "docId"`);
    await queryRunner.query(
      `ALTER TABLE "company_chat"."conversations_files" ADD CONSTRAINT "FK_805d6c0485821e3026fa10b73bf" FOREIGN KEY ("conversationId") REFERENCES "company_chat"."conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_chat"."conversations_files" ADD CONSTRAINT "FK_c89b22a8ad0e508788ee62b3f2f" FOREIGN KEY ("fileId") REFERENCES "company_chat"."files"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "company_chat"."conversations_files" ADD CONSTRAINT "FK_6157a82b69445b4bbe2f7906a75" FOREIGN KEY ("messageId") REFERENCES "company_chat"."messages"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "company_chat"."conversations_files" DROP CONSTRAINT "FK_6157a82b69445b4bbe2f7906a75"`);
    await queryRunner.query(`ALTER TABLE "company_chat"."conversations_files" DROP CONSTRAINT "FK_c89b22a8ad0e508788ee62b3f2f"`);
    await queryRunner.query(`ALTER TABLE "company_chat"."conversations_files" DROP CONSTRAINT "FK_805d6c0485821e3026fa10b73bf"`);
    await queryRunner.query(`ALTER TABLE "company_chat"."files" ADD "docId" integer NOT NULL`);
    await queryRunner.query(`ALTER TABLE "company_chat"."files" ADD "conversationId" integer`);
    await queryRunner.query(`DROP TABLE "company_chat"."conversations_files"`);
    await queryRunner.query(
      `ALTER TABLE "company_chat"."files" ADD CONSTRAINT "FK_d793e035119090188909fa6559a" FOREIGN KEY ("conversationId") REFERENCES "company_chat"."conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION company_chat.set_default_doc_id()
       RETURNS trigger
       LANGUAGE plpgsql
      AS $function$
            BEGIN
                IF NEW."docId" IS NULL THEN
                    NEW."docId" := NEW.id;
                END IF;
                RETURN NEW;
            END;
            $function$
      ;
    `);
    await queryRunner.query(`
      CREATE TRIGGER set_default_doc_id_trigger BEFORE INSERT ON
          company_chat.files FOR EACH ROW EXECUTE FUNCTION company_chat.set_default_doc_id();
    `);
  }
}
