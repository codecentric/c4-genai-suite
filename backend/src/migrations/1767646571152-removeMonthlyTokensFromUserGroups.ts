import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveMonthlyTokensFromUserGroups1767646571152 implements MigrationInterface {
  name = 'RemoveMonthlyTokensFromUserGroups1767646571152';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE company_chat."user-groups" DROP COLUMN "monthlyTokens"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE company_chat."user-groups" ADD COLUMN "monthlyTokens" integer`);
  }
}
