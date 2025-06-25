import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExtensionExternalId1750147424909 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE extensions ADD "externalId" character varying;`);

    await queryRunner.query(`
            CREATE OR REPLACE FUNCTION set_external_id()
            RETURNS TRIGGER AS $$
            BEGIN
                -- Only set external_id if it's NULL or empty string
                IF NEW."externalId" IS NULL THEN
                    NEW."externalId" := NEW."name" || '_' || NEW."id";
                END IF;
                
                -- Return the modified NEW record
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            CREATE TRIGGER set_external_id_trigger BEFORE INSERT ON extensions FOR EACH ROW EXECUTE FUNCTION set_external_id();
        `);

    await queryRunner.query(`UPDATE extensions SET "externalId" = name || '_' || id WHERE "externalId" IS NULL;`);

    await queryRunner.query(`
        ALTER TABLE extensions
        ALTER COLUMN "externalId" SET NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE extensions DROP COLUMN "externalId"`);
    await queryRunner.query(`DROP TRIGGER set_external_id_trigger ON extensions;`);
    await queryRunner.query(`DROP FUNCTION set_external_id();`);
  }
}
