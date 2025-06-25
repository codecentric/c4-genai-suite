import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateSourcesToNewFormat1750134137266 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE "messages" ADD "sourcesOriginal" json;

        UPDATE "messages" SET "sourcesOriginal" = "sources";

        -- Create a temporary function to handle the migration
        CREATE OR REPLACE FUNCTION migrate_sources() RETURNS void AS
        $$
        DECLARE
            message_record RECORD;
            old_sources    JSONB;
            new_sources    JSONB;
            old_source     JSONB;
            new_source     JSONB;
            chunk_ids      JSONB;
            pages          JSONB;
            numeric_pages  JSONB;
            i              INTEGER;
            j              INTEGER;
            k              INTEGER;
            start_page     INTEGER;
            end_page       INTEGER;
            chunk_id       TEXT;
            page_value     TEXT;
        BEGIN
            -- Loop through all messages
            FOR message_record IN SELECT id, sources FROM messages WHERE sources IS NOT NULL
                LOOP
                    BEGIN
                        -- Try to parse the sources as JSONB
                        old_sources := message_record.sources::jsonb;

                        -- Skip empty arrays
                        IF jsonb_typeof(old_sources) = 'array' AND jsonb_array_length(old_sources) = 0 THEN
                            CONTINUE;
                        END IF;

                        -- Initialize new sources array
                        new_sources := '[]'::jsonb;

                        -- Process each old source in the array
                        IF jsonb_typeof(old_sources) = 'array' THEN
                            FOR i IN 0..jsonb_array_length(old_sources) - 1
                                LOOP
                                    BEGIN
                                        old_source := old_sources -> i;

                                        -- Get chunk_ids array or default to empty array
                                        IF old_source ? 'metadata' AND old_source -> 'metadata' ? 'chunk_ids' THEN
                                            chunk_ids := old_source -> 'metadata' -> 'chunk_ids';
                                            -- Ensure chunk_ids is an array
                                            IF jsonb_typeof(chunk_ids) != 'array' THEN
                                                chunk_ids := '[]'::jsonb;
                                            END IF;
                                        ELSE
                                            chunk_ids := '[]'::jsonb;
                                        END IF;

                                        -- Get pages array or value
                                        IF old_source ? 'identity' AND old_source -> 'identity' ? 'pages' THEN
                                            pages := old_source -> 'identity' -> 'pages';
                                        ELSIF old_source ? 'metadata' AND old_source -> 'metadata' ? 'pages' THEN
                                            pages := old_source -> 'metadata' -> 'pages';
                                        ELSE
                                            pages := NULL;
                                        END IF;

                                        -- Convert string array elements to numbers
                                        IF jsonb_typeof(pages) = 'array' THEN
                                            numeric_pages := '[]'::jsonb;
                                            FOR k IN 0..jsonb_array_length(pages) - 1
                                                LOOP
                                                    -- Get the page value as text
                                                    page_value := pages ->> k;

                                                    -- Check if it's a range pattern like "1-2"
                                                    IF page_value ~ '^[0-9]+-[0-9]+$' THEN
                                                        -- Extract start and end of range
                                                        start_page :=
                                                                (regexp_match(page_value, '^([0-9]+)-[0-9]+$'))[1]::integer;
                                                        end_page :=
                                                                (regexp_match(page_value, '^[0-9]+-([0-9]+)$'))[1]::integer;

                                                        -- Add each page in the range to the array
                                                        FOR i IN start_page..end_page
                                                            LOOP
                                                                numeric_pages := numeric_pages || jsonb_build_array(i);
                                                            END LOOP;
                                                        -- If it's a simple numeric string, convert to integer
                                                    ELSIF page_value ~ '^[0-9]+$' THEN
                                                        numeric_pages :=
                                                                numeric_pages || jsonb_build_array(page_value::integer);
                                                    ELSE
                                                        -- Keep original value if not numeric or range
                                                        numeric_pages := numeric_pages || jsonb_build_array(page_value);
                                                    END IF;
                                                END LOOP;
                                            pages := numeric_pages;
                                        ELSIF jsonb_typeof(pages) = 'number' THEN
                                            -- If pages is a number, convert it to a single-element array
                                            pages := jsonb_build_array(pages);
                                        ELSIF jsonb_typeof(pages) = 'string' THEN
                                            IF page_value ~ '^[0-9]+$' THEN
                                                pages := jsonb_build_array(page_value::integer);
                                            ELSIF page_value ~ '^[0-9]+$' THEN
                                                pages := jsonb_build_array(page_value::integer);
                                            ELSE
                                                -- Keep original string value in an array
                                                pages := null;
                                            END IF;
                                        END IF;

                                        -- If chunk_ids is empty or undefined, create a single newSource with empty chunk.uri
                                        IF jsonb_array_length(chunk_ids) = 0 THEN
                                            new_source := jsonb_build_object(
                                                    'title', COALESCE(old_source ->> 'title', ''),
                                                    'chunk', jsonb_build_object(
                                                            'uri', NULL,
                                                            'content', NULL,
                                                            'pages', pages
                                                             ),
                                                    'document', jsonb_build_object(
                                                            'uri', CASE
                                                                       WHEN old_source ? 'identity' AND old_source -> 'identity' ? 'uniquePathOrId'
                                                                           THEN COALESCE(old_source -> 'identity' ->> 'uniquePathOrId', '')
                                                                       ELSE '' END,
                                                            'name', CASE
                                                                        WHEN old_source ? 'identity'
                                                                            THEN COALESCE(old_source -> 'identity' ->> 'fileName', '')
                                                                        ELSE '' END,
                                                            'mimeType', CASE
                                                                            WHEN old_source ? 'identity' AND old_source -> 'identity' ? 'mimeType'
                                                                                THEN COALESCE(old_source -> 'identity' ->> 'mimeType', '')
                                                                            ELSE '' END,
                                                            'size', CASE
                                                                        WHEN old_source ? 'identity'
                                                                            THEN old_source -> 'identity' -> 'fileSize'
                                                                        ELSE NULL END,
                                                            'link', CASE
                                                                        WHEN old_source ? 'identity'
                                                                            THEN old_source -> 'identity' -> 'link'
                                                                        ELSE NULL END
                                                                ),
                                                    'metadata', CASE
                                                                    WHEN old_source ? 'metadata' THEN
                                                                        (old_source -> 'metadata') - 'chunk_ids' - 'pages'
                                                                    ELSE
                                                                        '{}'::jsonb
                                                        END
                                                          );

                                            new_sources := new_sources || jsonb_build_array(new_source);
                                        ELSE
                                            -- Create a new newSource for each chunk_id
                                            FOR j IN 0..jsonb_array_length(chunk_ids) - 1
                                                LOOP
                                                    BEGIN
                                                        chunk_id := chunk_ids ->> j;

                                                        new_source := jsonb_build_object(
                                                                'title', COALESCE(old_source ->> 'title', ''),
                                                                'extensionExternalId', (select e."name" || '_' || e.id
                                                                                  from files f
                                                                                           join bucket b ON b.id = f."bucketId"
                                                                                           join extensions e ON (e.values::jsonb ->> 'bucket')::integer = b.id
                                                                                  where f."docId" = (old_source -> 'identity' ->> 'uniquePathOrId')::integer
                                                                                  LIMIT 1),
                                                                'chunk', jsonb_build_object(
                                                                        'uri', COALESCE(chunk_id, NULL),
                                                                        'content', NULL,
                                                                        'pages', pages
                                                                         ),
                                                                'document', jsonb_build_object(
                                                                        'uri', CASE
                                                                                   WHEN old_source ? 'identity' AND old_source -> 'identity' ? 'uniquePathOrId'
                                                                                       THEN COALESCE(old_source -> 'identity' ->> 'uniquePathOrId', '')
                                                                                   ELSE '' END,
                                                                        'name', CASE
                                                                                    WHEN old_source ? 'identity'
                                                                                        THEN COALESCE(old_source -> 'identity' ->> 'fileName', '')
                                                                                    ELSE '' END,
                                                                        'mimeType', CASE
                                                                                        WHEN old_source ? 'identity' AND old_source -> 'identity' ? 'mimeType'
                                                                                            THEN COALESCE(old_source -> 'identity' ->> 'mimeType', '')
                                                                                        ELSE '' END,
                                                                        'size', CASE
                                                                                    WHEN old_source ? 'identity'
                                                                                        THEN old_source -> 'identity' -> 'fileSize'
                                                                                    ELSE NULL END,
                                                                        'link', CASE
                                                                                    WHEN old_source ? 'identity'
                                                                                        THEN old_source -> 'identity' -> 'link'
                                                                                    ELSE NULL END
                                                                            ),
                                                                'metadata', CASE
                                                                                WHEN old_source ? 'metadata' THEN
                                                                                    (old_source -> 'metadata') - 'chunk_ids' - 'pages'
                                                                                ELSE
                                                                                    '{}'::jsonb
                                                                    END
                                                                      );

                                                        new_sources := new_sources || jsonb_build_array(new_source);
                                                    EXCEPTION
                                                        WHEN OTHERS THEN
                                                            RAISE NOTICE 'Error processing chunk_id at index % for message id %: %', j, message_record.id, SQLERRM;
                                                    END;
                                                END LOOP;
                                        END IF;
                                    EXCEPTION
                                        WHEN OTHERS THEN
                                            RAISE NOTICE 'Error processing source at index % for message id %: %', i, message_record.id, SQLERRM;
                                    END;
                                END LOOP;

                            -- Update the message with the new sources format
                            UPDATE messages SET "sources" = new_sources WHERE id = message_record.id;
                        END IF;
                    EXCEPTION
                        WHEN OTHERS THEN
                            RAISE NOTICE 'Error processing message id %: %', message_record.id, SQLERRM;
                    END;
                END LOOP;
        END;
        $$ LANGUAGE plpgsql;
        -- Execute the migration function
        SELECT migrate_sources();
        -- Drop the temporary function
        DROP FUNCTION migrate_sources();    
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE "messages" SET "sources" = "sourcesOriginal";`);
    await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "sourcesOriginal";`);
  }
}
