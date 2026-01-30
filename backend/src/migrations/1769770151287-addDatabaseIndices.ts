import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDatabaseIndices1769770151287 implements MigrationInterface {
  name = 'AddDatabaseIndices1769770151287';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE INDEX "IDX_1ebdbbb95685fd1e929be48846" ON "company_chat"."blobs" ("userId") `);
    await queryRunner.query(`CREATE INDEX "IDX_e028c154ec26db08276f5e00dc" ON "company_chat"."blobs" ("fileId") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_88c6b99d73cb52e3a7f617205a" ON "company_chat"."extensions" ("configurationId", "enabled") `,
    );
    await queryRunner.query(`CREATE INDEX "IDX_74cf6af3ad47c54f9863ee51d0" ON "company_chat"."extensions" ("configurationId") `);
    await queryRunner.query(`CREATE INDEX "IDX_343fd9190f072c137848a25d58" ON "company_chat"."files" ("extensionId") `);
    await queryRunner.query(`CREATE INDEX "IDX_e83bfc04014067b853120b92ac" ON "company_chat"."files" ("bucketId", "userId") `);
    await queryRunner.query(`CREATE INDEX "IDX_30684080549b7e451cd571009d" ON "company_chat"."messages" ("configurationId") `);
    await queryRunner.query(`CREATE INDEX "IDX_7d473d0de3669832052cac98b9" ON "company_chat"."messages" ("parentId") `);
    await queryRunner.query(`CREATE INDEX "IDX_dfe166ccdd53722597a90f6324" ON "company_chat"."messages" ("type", "createdAt") `);
    await queryRunner.query(`CREATE INDEX "IDX_e5663ce0c730b2de83445e2fd1" ON "company_chat"."messages" ("conversationId") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_6157a82b69445b4bbe2f7906a7" ON "company_chat"."conversations_files" ("messageId") `,
    );
    await queryRunner.query(`CREATE INDEX "IDX_c89b22a8ad0e508788ee62b3f2" ON "company_chat"."conversations_files" ("fileId") `);
    await queryRunner.query(
      `CREATE INDEX "IDX_805d6c0485821e3026fa10b73b" ON "company_chat"."conversations_files" ("conversationId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e06bab1570a461291c3b58db05" ON "company_chat"."conversations" ("configurationId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6e1fc25c9e988cd5688b39f14f" ON "company_chat"."conversations" ("userId", "updatedAt") `,
    );
    await queryRunner.query(`CREATE INDEX "IDX_f1d808c912ae97b0e06e0c1042" ON "company_chat"."user-groups" ("name") `);
    await queryRunner.query(`CREATE INDEX "IDX_2e9e90539cd93eda27bc693a8f" ON "company_chat"."configurations" ("status") `);
    await queryRunner.query(`CREATE INDEX "IDX_e411818f2602a32560915f0753" ON "company_chat"."usages" ("userId", "date") `);
    await queryRunner.query(`CREATE INDEX "IDX_44f236ae45e741c44b932a403f" ON "company_chat"."usages" ("counter", "date") `);
    await queryRunner.query(`CREATE INDEX "IDX_57de40bc620f456c7311aa3a1e" ON "company_chat"."sessions" ("userId") `);
    await queryRunner.query(`CREATE INDEX "IDX_ff769cfb5bd69714cfb7618cb0" ON "company_chat"."cache" ("expires") `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "company_chat"."IDX_ff769cfb5bd69714cfb7618cb0"`);
    await queryRunner.query(`DROP INDEX "company_chat"."IDX_57de40bc620f456c7311aa3a1e"`);
    await queryRunner.query(`DROP INDEX "company_chat"."IDX_44f236ae45e741c44b932a403f"`);
    await queryRunner.query(`DROP INDEX "company_chat"."IDX_e411818f2602a32560915f0753"`);
    await queryRunner.query(`DROP INDEX "company_chat"."IDX_2e9e90539cd93eda27bc693a8f"`);
    await queryRunner.query(`DROP INDEX "company_chat"."IDX_f1d808c912ae97b0e06e0c1042"`);
    await queryRunner.query(`DROP INDEX "company_chat"."IDX_6e1fc25c9e988cd5688b39f14f"`);
    await queryRunner.query(`DROP INDEX "company_chat"."IDX_e06bab1570a461291c3b58db05"`);
    await queryRunner.query(`DROP INDEX "company_chat"."IDX_805d6c0485821e3026fa10b73b"`);
    await queryRunner.query(`DROP INDEX "company_chat"."IDX_c89b22a8ad0e508788ee62b3f2"`);
    await queryRunner.query(`DROP INDEX "company_chat"."IDX_6157a82b69445b4bbe2f7906a7"`);
    await queryRunner.query(`DROP INDEX "company_chat"."IDX_e5663ce0c730b2de83445e2fd1"`);
    await queryRunner.query(`DROP INDEX "company_chat"."IDX_dfe166ccdd53722597a90f6324"`);
    await queryRunner.query(`DROP INDEX "company_chat"."IDX_7d473d0de3669832052cac98b9"`);
    await queryRunner.query(`DROP INDEX "company_chat"."IDX_30684080549b7e451cd571009d"`);
    await queryRunner.query(`DROP INDEX "company_chat"."IDX_e83bfc04014067b853120b92ac"`);
    await queryRunner.query(`DROP INDEX "company_chat"."IDX_343fd9190f072c137848a25d58"`);
    await queryRunner.query(`DROP INDEX "company_chat"."IDX_74cf6af3ad47c54f9863ee51d0"`);
    await queryRunner.query(`DROP INDEX "company_chat"."IDX_88c6b99d73cb52e3a7f617205a"`);
    await queryRunner.query(`DROP INDEX "company_chat"."IDX_e028c154ec26db08276f5e00dc"`);
    await queryRunner.query(`DROP INDEX "company_chat"."IDX_1ebdbbb95685fd1e929be48846"`);
  }
}
