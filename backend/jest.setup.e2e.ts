import * as process from 'node:process';
import { Logger } from '@nestjs/common';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Client } from 'pg';
import { Wait } from 'testcontainers';

const logger = new Logger();

const init = async () => {
  process.env.TZ = 'UTC';
  if (process.env.CI) {
    logger.log('skipping test container setup due pipeline');
  } else {
    logger.log('spinning up test container');
    await setupDatabase();
  }
};

async function setupDatabase(): Promise<{ dbClient: Client; dbContainer: StartedPostgreSqlContainer }> {
  const postgresContainer: StartedPostgreSqlContainer = await new PostgreSqlContainer('postgres:17.5-alpine')
    .withWaitStrategy(Wait.forListeningPorts())
    .start();
  const postgresClient: Client = new Client({ connectionString: postgresContainer.getConnectionUri() });

  process.env.DB_URL = postgresContainer.getConnectionUri();

  // @ts-expect-error setting global to use it in the teardown function
  globalThis.dbClient = postgresClient;
  // @ts-expect-error setting global to use it in the teardown function
  globalThis.dbContainer = postgresContainer;

  return {
    dbClient: postgresClient,
    dbContainer: postgresContainer,
  };
}

export default init;
