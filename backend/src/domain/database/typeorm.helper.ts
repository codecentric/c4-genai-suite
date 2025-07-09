import { BadRequestException, Provider } from '@nestjs/common';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { EntityClassOrSchema } from '@nestjs/typeorm/dist/interfaces/entity-class-or-schema.type';
import { DataSource, EntityManager, EntityTarget, ObjectLiteral, QueryRunner, Repository } from 'typeorm';
import { GroupBy } from '../chat/statistics';

type RepositoryConstructorType<T extends ObjectLiteral> = new (
  target: EntityTarget<T>,
  manager: EntityManager,
  queryRunner?: QueryRunner,
) => Repository<T>;

export function registerRepositoryForEntity<T extends ObjectLiteral>(
  repository: RepositoryConstructorType<T>,
  entity: EntityTarget<T> & EntityClassOrSchema,
): Provider {
  return {
    provide: getRepositoryToken(entity),
    inject: [getDataSourceToken()],
    useFactory(datasource: DataSource) {
      const { target, manager, queryRunner } = datasource.getRepository<T>(entity);
      return new repository(target, manager, queryRunner);
    },
  };
}

export function dateTrunc(groupBy: GroupBy, wrappedColumn: string): string {
  switch (groupBy) {
    case GroupBy.Day:
      return `DATE_TRUNC('day', ${wrappedColumn})`;
    case GroupBy.Week:
      return `DATE_TRUNC('week', ${wrappedColumn})`;
    case GroupBy.Month:
      return `DATE_TRUNC('month', ${wrappedColumn})`;
    default:
      throw new BadRequestException('invalid groupBy');
  }
}

export function interval(groupBy: GroupBy): string {
  switch (groupBy) {
    case GroupBy.Day:
      return `'1 day'::interval`;
    case GroupBy.Week:
      return `'1 week'::interval`;
    case GroupBy.Month:
      return `'1 month'::interval`;
    default:
      throw new BadRequestException('invalid groupBy');
  }
}

export const schema = 'company_chat';

// this is needed to ensure that migrations exists in the target schema (company_chat)
export async function initSchemaIfNotExistsAndMoveMigrations(url: string, schema: string) {
  const dataSource = new DataSource({
    url,
    type: 'postgres',
    synchronize: false,
    migrationsRun: false,
  });

  await dataSource.initialize();
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.query(`
          BEGIN;
          DO $$
          BEGIN
              CREATE SCHEMA IF NOT EXISTS ${schema};
              IF EXISTS (
                SELECT 1
                    FROM information_schema.tables
                    WHERE table_schema = 'public'
                    AND table_name = 'migrations'
                ) THEN
                  ALTER TABLE public.migrations SET SCHEMA ${schema};
              END IF;
          END $$;
          COMMIT;
        `);
  await queryRunner.release();
  await dataSource.destroy();
}
