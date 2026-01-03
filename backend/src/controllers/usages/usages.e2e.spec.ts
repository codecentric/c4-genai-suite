import { randomInt } from 'crypto';
import { Server } from 'net';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { startOfDay, startOfMonth, startOfWeek, subDays, subMonths, subWeeks } from 'date-fns';
import * as request from 'supertest';
import { DataSource, Repository } from 'typeorm';
import { GroupBy } from 'src/domain/chat/statistics';
import { AppModule } from '../../app.module';
import {
  ConfigurationEntity,
  ConfigurationStatus,
  ConversationEntity,
  MessageEntity,
  trackUsage,
  UsageEntity,
  UsageRepository,
  UserEntity,
} from '../../domain/database';
import { initAppWithDataBaseAndValidUser } from '../../utils/testUtils';
import { UsagesDto, UsersCountsDto } from './dtos';
import { UsagesController } from './usages.controller';

describe('Usages', () => {
  let controller: UsagesController;
  let app: INestApplication<Server>;
  let dataSource: DataSource;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    controller = module.get(UsagesController);

    const initialized = await initAppWithDataBaseAndValidUser(dataSource, module, app);
    dataSource = initialized.dataSource;
    app = initialized.app;
    await seedTestData(dataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
  it('should retrieve all user counts per day for the last 20 days', async () => {
    const since = subDays(new Date(), 19);
    const response = await request(app.getHttpServer())
      .get('/usages/users-count')
      .query({
        since: since,
      })
      .expect(200);

    const typedBody = response.body as UsersCountsDto;

    expect(typedBody.items).toHaveLength(20);
    const { startDate, endDate } = getMockDates();

    assertUsages(typedBody, startDate, endDate);
  });
  it('should retrieve all user counts of the last 2 months grouped by month', async () => {
    const lastMonth = startOfMonth(subMonths(new Date(), 1));

    const response = await request(app.getHttpServer())
      .get('/usages/users-count')
      .query({ since: lastMonth, groupBy: GroupBy.Month })
      .expect(200);

    const typedBody = response.body as UsersCountsDto;

    expect(typedBody.items).toHaveLength(2);
  });
  it('should retrieve all user counts of the last 3 weeks grouped by week', async () => {
    const beforeLastWeek = startOfWeek(subWeeks(new Date(), 2), { weekStartsOn: 1 });

    const response = await request(app.getHttpServer())
      .get('/usages/users-count')
      .query({ since: beforeLastWeek, groupBy: GroupBy.Week })
      .expect(200);

    const typedBody = response.body as UsersCountsDto;

    expect(typedBody.items).toHaveLength(3);
  });
  it('should retrieve users without filter', async () => {
    const response = await request(app.getHttpServer()).get('/usages/users-count').expect(200);
    const typedBody = response.body as UsersCountsDto;
    const items = typedBody.items;
    const itemsFirstDayLastMonth = items[0];
    const itemsToday = items[items.length - 1];
    expect(itemsFirstDayLastMonth.total).toBe(2);
    expect(itemsToday.total).toBe(3);
  });
  it('should retrieve users since yesterday', async () => {
    const since = subDays(new Date(), 1);
    const response = await request(app.getHttpServer()).get('/usages/users-count').query({ since: since }).expect(200);
    const typedBody = response.body as UsersCountsDto;
    const items = typedBody.items;

    expect(items.length).toBe(2);

    const itemsYesterday = items[0];
    const itemsToday = items[1];

    expect(itemsYesterday.total).toBe(0);
    expect(itemsToday.total).toBe(3);
  });
  it('should retrieve users since last month grouped by month', async () => {
    const since = startOfMonth(subMonths(new Date(), 1));
    const response = await request(app.getHttpServer())
      .get('/usages/users-count')
      .query({ since: since, groupBy: 'month' })
      .expect(200);
    const typedBody = response.body as UsersCountsDto;
    const items = typedBody.items;

    expect(items.length).toBe(2);

    const itemsLastMonth = items[0];
    const itemsCurrentMonth = items[1];

    expect(itemsLastMonth.total).toBe(2);
    expect(itemsCurrentMonth.total).toBe(3);
  });
  it('should retrieve token usages using utc timezone dates', async () => {
    const today = startOfDay(new Date());
    const since = subDays(today, 1);
    const response = await request(app.getHttpServer())
      .get('/usages/tokens')
      .query({
        since: since,
      })
      .expect(200);

    const typedBody = response.body as UsagesDto;

    expect(typedBody.items).toHaveLength(2);
    expect(typedBody.items[0].total).toBe(0);
    expect(typedBody.items[1].total).toBeGreaterThanOrEqual(1);
    expect(typedBody.items[0]).toHaveProperty('date', since.toISOString());
    expect(typedBody.items[1]).toHaveProperty('date', today.toISOString());
  });
});

async function seedTestData(dataSource: DataSource) {
  const userRepository = dataSource.getRepository(UserEntity);
  const configurationRepository = dataSource.getRepository(ConfigurationEntity);
  const conversationRepository = dataSource.getRepository(ConversationEntity);
  const messagesRepository = dataSource.getRepository(MessageEntity);
  const usageRepository = dataSource.getRepository(UsageEntity) as UsageRepository;

  const userEntities = await createUserEntities(3, userRepository);
  const configurationEntity = await createConfigurationEntity(configurationRepository);

  const now = new Date();

  // All users send a message today
  for (const userEntity of userEntities) {
    const conversationEntity = await createConversationEntity(userEntity.id, configurationEntity.id, conversationRepository);

    await createMessageEntity(conversationEntity.id, configurationEntity.id, now, messagesRepository);
    await createUsageEntity(now, userEntity, usageRepository);
  }

  // two users send a message last month
  for (let i = 0; i < userEntities.length - 1; i++) {
    const conversationEntity = await createConversationEntity(userEntities[i].id, configurationEntity.id, conversationRepository);
    await createMessageEntity(conversationEntity.id, configurationEntity.id, startOfMonth(subMonths(now, 1)), messagesRepository);
  }

  const configurations = await configurationRepository.find();

  expect(configurations).toHaveLength(1);
}

const getMockDates = () => {
  const startDate: string = startOfDay(new Date()).toISOString();
  const endDate: string = startOfDay(subDays(startDate, 19)).toISOString();
  return { startDate, endDate };
};

const assertUsages = (typedBody: UsersCountsDto, startDate: string, endDate: string) => {
  expect(typedBody.items).toHaveLength(20);
  expect(typedBody.items[19]).toMatchObject({ date: startDate, total: expect.any(Number) as number });
  expect(typedBody.items[0]).toMatchObject({ date: endDate, total: expect.any(Number) as number });
};

async function createUserEntities(quantity: number, userRepository: Repository<UserEntity>): Promise<UserEntity[]> {
  const userEntities: UserEntity[] = [];
  for (let i = 0; i < quantity; i++) {
    const userEntity = new UserEntity();
    userEntity.id = crypto.randomUUID();
    userEntity.name = `test-${i}`;
    userEntity.email = `user-${i}@test.com`;
    userEntities.push(userEntity);
  }
  return userRepository.save(userEntities);
}

async function createConfigurationEntity(configurationRepository: Repository<ConfigurationEntity>): Promise<ConfigurationEntity> {
  const configurationEntity = new ConfigurationEntity();
  configurationEntity.id = 1;
  configurationEntity.name = 'Assistant-E2E';
  configurationEntity.status = ConfigurationStatus.ENABLED;

  return configurationRepository.save(configurationEntity);
}

async function createConversationEntity(
  userId: string,
  configurationId: number,
  conversationRepository: Repository<ConversationEntity>,
): Promise<ConversationEntity> {
  const conversationEntity = new ConversationEntity();
  conversationEntity.configurationId = configurationId;
  conversationEntity.userId = userId;

  return conversationRepository.save(conversationEntity);
}

async function createMessageEntity(
  conversationId: number,
  configurationId: number,
  creationDate: Date,
  messageRepository: Repository<MessageEntity>,
): Promise<MessageEntity> {
  const messageEntity = new MessageEntity();
  messageEntity.conversationId = conversationId;
  messageEntity.configurationId = configurationId;
  messageEntity.createdAt = creationDate;
  messageEntity.type = 'text';
  messageEntity.type = 'human';
  messageEntity.data = { text: 'test' };

  return messageRepository.save(messageEntity);
}

async function createUsageEntity(date: Date, userEntity: UserEntity, usageRepository: UsageRepository): Promise<void> {
  const usageEntity = new UsageEntity();
  usageEntity.date = startOfDay(date);
  usageEntity.userId = userEntity.id;
  usageEntity.counter = 'token_usage';
  usageEntity.key = 'azure-open-ai';
  usageEntity.subKey = 'gpt-4o';
  usageEntity.count = randomInt(1, 2000);
  await trackUsage(usageRepository, usageEntity);
}
