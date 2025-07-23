import * as path from 'path';
import { config as dotenvConfig } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';
import { initSchemaIfNotExistsAndMoveMigrations, schema } from '../domain/database/typeorm.helper';

dotenvConfig();

const url = process.env.DB_URL as string;

const migrationDataSource = new DataSource({
  type: 'postgres',
  url,
  entities: [path.join(__dirname, '..', 'domain', 'database', 'entities', '*{.ts,.js}')],
  migrations: [path.join(__dirname, '..', 'migrations', '*{.ts,.js}')],
  logging: true,
  schema,
} as DataSourceOptions);

async function createDataSourceConfig() {
  await initSchemaIfNotExistsAndMoveMigrations(url, schema);
  return migrationDataSource;
}

export default createDataSourceConfig();
