import { Server } from 'net';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from '../../app.module';
import {
  BucketEntity,
  ConfigurationEntity,
  ConversationEntity,
  FileEntity,
  FileUploadStatus,
  MessageEntity,
  UserEntity,
} from '../../domain/database';
import { schema } from '../../domain/database/typeorm.helper';
import { buildClient } from '../../domain/files/use-cases/utils';
import { initAppWithDataBaseAndValidUser } from '../../utils/testUtils';
import { ConversationsController } from './conversations.controller';
import { ConversationDto } from './dtos';

jest.mock('../../domain/files/use-cases/utils', () => ({
  buildClient: jest.fn(),
}));

describe('Conversations', () => {
  let app: INestApplication<Server>;
  let dataSource: DataSource;
  let controller: ConversationsController;

  let conversationId: number;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    controller = module.get(ConversationsController);

    const initialized = await initAppWithDataBaseAndValidUser(dataSource, module, app);
    dataSource = initialized.dataSource;
    app = initialized.app;
    await cleanDatabase(dataSource);
    const conversation = await seedTestData(dataSource);
    conversationId = conversation.id;

    (buildClient as jest.Mock).mockImplementation(() => ({
      duplicateEmbeddings: jest.fn().mockResolvedValue({}),
    }));
  });

  afterAll(async () => {
    await cleanDatabase(dataSource);
    await dataSource.destroy();
    await app.close();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
  it('should retrieve conversation by id', async () => {
    const response = await request(app.getHttpServer()).get('/conversations/1').expect(200);
    const typedBody = response.body as ConversationDto;

    expect(typedBody).toBeDefined();
    expect(typedBody.id).toBe(1);
    expect(typedBody.name).toBe('Greetings Exchange');
  });
  it('should duplicate conversation', async () => {
    const response = await request(app.getHttpServer()).post(`/conversations/${conversationId}/duplicate`).expect(201);
    const typedBody = response.body as ConversationDto;

    expect(typedBody).toBeDefined();
    expect(typedBody.id).not.toBe(conversationId); // must be a new ID
    expect(typedBody.name).toBe('Greetings Exchange (2)');
  });
  it('should duplicate conversation twice with distinct names', async () => {
    const response = await request(app.getHttpServer()).post(`/conversations/${conversationId}/duplicate`).expect(201);
    const typedBody = response.body as ConversationDto;

    expect(typedBody).toBeDefined();
    expect(typedBody.id).not.toBe(conversationId);
    expect(typedBody.name).toBe('Greetings Exchange (3)');
  });
});

async function cleanDatabase(dataSource: DataSource) {
  const entities = dataSource.entityMetadatas;

  for (const entity of entities) {
    const repository = dataSource.getRepository(entity.name);
    await repository.query(`TRUNCATE TABLE ${schema}."${entity.tableName}" RESTART IDENTITY CASCADE`);
  }
}

async function seedTestData(dataSource: DataSource) {
  const userRepository = dataSource.getRepository(UserEntity);
  const configurationRepository = dataSource.getRepository(ConfigurationEntity);
  const conversationRepository = dataSource.getRepository(ConversationEntity);
  const messageRepository = dataSource.getRepository(MessageEntity);
  const fileRepository = dataSource.getRepository(FileEntity);
  const bucketRepository = dataSource.getRepository(BucketEntity);

  const userEntity = await createUser(userRepository);
  const configurationEntity = await createConfiguration(configurationRepository);

  const conversation = await createConversationEntity(conversationRepository, configurationEntity, userEntity);
  const bucketEntity = await createBucket(bucketRepository);
  await createFiles(fileRepository, conversation.id, bucketEntity);
  await createMessages(messageRepository, conversation.id, configurationEntity.id);

  return conversation;
}

function createConfiguration(configurationRepository: Repository<ConfigurationEntity>): Promise<ConfigurationEntity> {
  const configurationEntity = new ConfigurationEntity();
  configurationEntity.name = 'Test Configuration';
  configurationEntity.enabled = true;

  return configurationRepository.save(configurationEntity);
}

function createUser(userRepository: Repository<UserEntity>): Promise<UserEntity> {
  const userEntity = new UserEntity();
  userEntity.id = '1';
  userEntity.name = 'test-user';
  userEntity.email = 'test@example.com';

  return userRepository.save(userEntity);
}

function createConversationEntity(
  conversationRepository: Repository<ConversationEntity>,
  configuration: ConfigurationEntity,
  user: UserEntity,
): Promise<ConversationEntity> {
  const conversationEntity = new ConversationEntity();
  conversationEntity.configuration = configuration;
  conversationEntity.user = user;
  conversationEntity.name = 'Greetings Exchange';

  return conversationRepository.save(conversationEntity);
}

function createMessages(
  messageRepository: Repository<MessageEntity>,
  conversationId: number,
  configurationId: number,
): Promise<MessageEntity[]> {
  const messages = [];
  const message1 = new MessageEntity();
  message1.conversationId = conversationId;
  message1.configurationId = configurationId;
  message1.createdAt = new Date();
  message1.type = 'human';
  message1.data = `{"content":"hi","additional_kwargs":{},"response_metadata":{}}`;
  messages.push(message1);

  const message2 = new MessageEntity();
  message2.conversationId = conversationId;
  message2.configurationId = configurationId;
  message2.createdAt = new Date();
  message2.type = 'ai';
  message2.data = `{"content":"Hello! How can I assist you today?","tool_calls":[],"invalid_tool_calls":[],"additional_kwargs":{},"response_metadata":{}}`;
  messages.push(message2);

  return messageRepository.save(messages);
}

function createFiles(
  fileRepository: Repository<FileEntity>,
  conversationId: number,
  bucketEntity: BucketEntity,
): Promise<FileEntity> {
  const fileEntity = new FileEntity();
  fileEntity.conversationId = conversationId;
  fileEntity.mimeType = 'application/pdf';
  fileEntity.fileName = 'test.pdf';
  fileEntity.fileSize = 1024;
  fileEntity.uploadStatus = FileUploadStatus.Successful;
  fileEntity.bucket = bucketEntity;

  return fileRepository.save(fileEntity);
}

function createBucket(bucketRepository: Repository<BucketEntity>): Promise<BucketEntity> {
  const bucketEntity = new BucketEntity();
  bucketEntity.id = 1;
  bucketEntity.name = 'Test Bucket';
  bucketEntity.type = 'conversation';
  bucketEntity.endpoint = 'http://localhost:1234';
  bucketEntity.isDefault = false;

  return bucketRepository.save(bucketEntity);
}
