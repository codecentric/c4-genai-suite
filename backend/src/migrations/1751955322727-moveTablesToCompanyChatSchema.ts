import { MigrationInterface, QueryRunner } from 'typeorm';

export class MoveTablesToCompanyChatSchema1751955322727 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA company_chat`);

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

    await queryRunner.query(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT conname, conrelid::regclass, confrelid::regclass
                  FROM pg_constraint
                  WHERE connamespace = 'public'::regnamespace and conrelid::regclass <> 'migrations'::regclass) LOOP
          EXECUTE format('ALTER TABLE %s.%s DROP CONSTRAINT %s',
                         'company_chat',
                         r.conrelid,
                         r.conname);
          EXECUTE format('ALTER TABLE %s.%s ADD CONSTRAINT %s FOREIGN KEY (%s) REFERENCES %s.%s(%s)',
                         'company_chat',
                         r.conrelid,
                         r.conname,
                         (SELECT string_agg(attname, ', ') FROM pg_attribute WHERE attrelid = r.conrelid AND attnum = ANY(r.conkey)),
                         'company_chat',
                         r.confrelid,
                         (SELECT string_agg(attname, ', ') FROM pg_attribute WHERE attrelid = r.confrelid AND attnum = ANY(r.confkey)));
        END LOOP;
      END $$;
    `);

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

    // Update foreign key constraints to reference the new schema
    await queryRunner.query(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT conname, conrelid::regclass, confrelid::regclass
                  FROM pg_constraint
                  WHERE connamespace = 'company_chat'::regnamespace) LOOP
          EXECUTE format('ALTER TABLE %s.%s DROP CONSTRAINT %s',
                         'public',
                         r.conrelid,
                         r.conname);
          EXECUTE format('ALTER TABLE %s.%s ADD CONSTRAINT %s FOREIGN KEY (%s) REFERENCES %s.%s(%s)',
                         'public',
                         r.conrelid,
                         r.conname,
                         (SELECT string_agg(attname, ', ') FROM pg_attribute WHERE attrelid = r.conrelid AND attnum = ANY(r.conkey)),
                         'public',
                         r.confrelid,
                         (SELECT string_agg(attname, ', ') FROM pg_attribute WHERE attrelid = r.confrelid AND attnum = ANY(r.confkey)));
        END LOOP;
      END $$;
    `);

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
