import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReplaceAzureReasoningExtensionByAzureExtension1758289967016 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `update company_chat.extensions set "name" = 'azure-open-ai-model' where "name"  = 'azure-open-ai-model-reasoning'`,
    );
  }

  public async down(_: QueryRunner): Promise<void> {}
}
