import { MigrationInterface, QueryRunner } from 'typeorm';

export class MoveTablesToCompanyChatSchema1751955322727 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS company_chat;`);

    const tables = [
      'blobs',
      'bucket',
      'cache',
      'configurations',
      'configurations_user_groups_user-groups',
      'configurations_users',
      'conversations',
      'extensions',
      'files',
      'messages',
      'sessions',
      'settings',
      'usages',
      'users',
      'user-groups',
    ];

    for (const table of tables) {
      await queryRunner.query(`ALTER TABLE public."${table}" SET SCHEMA company_chat`);
    }

    const types = ['blobs_category_enum', 'bucket_type_enum'];

    for (const type of types) {
      await queryRunner.query(`ALTER TYPE public.${type} SET SCHEMA company_chat`);
    }

    const functions = ['set_default_doc_id', 'set_external_id'];

    for (const fn of functions) {
      await queryRunner.query(`ALTER FUNCTION public.${fn}() SET SCHEMA company_chat`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      'blobs',
      'bucket',
      'cache',
      'configurations',
      'configurations_user_groups_user-groups',
      'configurations_users',
      'conversations',
      'extensions',
      'files',
      'messages',
      'sessions',
      'settings',
      'usages',
      'users',
      'user-groups',
    ];

    for (const table of tables) {
      await queryRunner.query(`ALTER TABLE company_chat."${table}" SET SCHEMA public`);
    }

    const types = ['blobs_category_enum', 'bucket_type_enum'];

    for (const type of types) {
      await queryRunner.query(`ALTER TYPE company_chat.${type} SET SCHEMA public`);
    }

    const functions = ['set_default_doc_id', 'set_external_id'];

    for (const fn of functions) {
      await queryRunner.query(`ALTER FUNCTION company_chat.${fn}() SET SCHEMA public`);
    }
  }
}
