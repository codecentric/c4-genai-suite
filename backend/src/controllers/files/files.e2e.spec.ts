import { Server } from 'net';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from '../../app.module';
import { ConfigurationEntity, ConversationEntity, MessageEntity, UserEntity } from '../../domain/database';
import { initAppWithDataBaseAndValidUser } from '../../utils/testUtils';
import { FilesController } from './files.controller';

describe('Files', () => {
  let controller: FilesController;
  let app: INestApplication<Server>;
  let dataSource: DataSource;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    controller = module.get(FilesController);

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
  it('should return document not found when documentId is missing', async () => {
    const existingConversationId = 1;
    const existingMessageId = 1;
    const response = await request(app.getHttpServer())
      .get(`/conversations/${existingConversationId}/messages/${existingMessageId}/documents/0/chunks`)
      .expect(HttpStatus.NOT_FOUND);
    const body = response.body as { message: string[] };
    expect(body).toBeDefined();
    expect(body.message).toBe('Cannot find a document with uri 0 for this user');
  });
  it('should return message not found when messageId is missing', async () => {
    const existingConversationId = 1;
    const existingDocumentId = 1;
    const response = await request(app.getHttpServer())
      .get(`/conversations/${existingConversationId}/messages/0/documents/${existingDocumentId}/chunks`)
      .expect(HttpStatus.NOT_FOUND);
    const body = response.body as { message: string[] };
    expect(body).toBeDefined();
    expect(body.message).toBe('Cannot find a message with id 0 for this user');
  });
  it('should return document not found if document does not exist', async () => {
    const existingConversationId = 1;
    const existingMessageId = 1;
    const notExistingDocumentId = 2;
    const response = await request(app.getHttpServer())
      .get(`/conversations/${existingConversationId}/messages/${existingMessageId}/documents/${notExistingDocumentId}/chunks`)
      .expect(HttpStatus.NOT_FOUND);
    const body = response.body as { message: string[] };
    expect(body).toBeDefined();
    expect(body.message).toBe(`Cannot find a document with uri 2 for this user`);
  });
  it('should return document content for chunk ids', async () => {
    const existingConversationId = 1;
    const existingMessageId = 1;
    const existingDocumentId = 1;
    const response = await request(app.getHttpServer())
      .get(`/conversations/${existingConversationId}/messages/${existingMessageId}/documents/${existingDocumentId}/chunks`)
      .expect(200);

    const body = response.body as string[];
    expect(body).toBeDefined();
    expect(body).toHaveLength(2);
    expect(body).toEqual(['content1', 'content2']);
  });
});

async function seedTestData(dataSource: DataSource) {
  const userRepository = dataSource.getRepository(UserEntity);
  await createUserEntity(userRepository);
  const configurationRepository = dataSource.getRepository(ConfigurationEntity);
  await createConfigurationEntity(configurationRepository);
  const conversationRepository = dataSource.getRepository(ConversationEntity);
  await createConversationEntity(conversationRepository);
  const messageRepository = dataSource.getRepository(MessageEntity);
  await createMessageEntity(messageRepository);
}

function createUserEntity(repository: Repository<UserEntity>): Promise<UserEntity> {
  const entity = new UserEntity();
  entity.id = '1';
  entity.name = 'test';
  entity.email = 'newuser@test.com';
  entity.userGroupId = 'admin';
  return repository.save(entity);
}

function createConfigurationEntity(repository: Repository<ConfigurationEntity>): Promise<ConfigurationEntity> {
  const entity = new ConfigurationEntity();
  entity.id = 1;
  entity.name = 'test';
  entity.enabled = true;
  return repository.save(entity);
}

function createConversationEntity(repository: Repository<ConversationEntity>): Promise<ConversationEntity> {
  const entity = new ConversationEntity();
  entity.id = 1;
  entity.configurationId = 1;
  entity.userId = '1';
  return repository.save(entity);
}

function createMessageEntity(repository: Repository<MessageEntity>) {
  const entity = new MessageEntity();
  entity.id = 1;
  entity.conversationId = 1;
  entity.data = { content: 'empty' };
  entity.type = 'ai';
  entity.sources = [
    {
      extensionExternalId: '',
      title: '',
      document: { uri: '1', mimeType: 'text/plain' },
      chunk: { uri: '1', content: 'content1', pages: [], score: 0 },
    },
    {
      extensionExternalId: '',
      title: '',
      document: { uri: '1', mimeType: 'text/plain' },
      chunk: { uri: '1', content: 'content2', pages: [], score: 0 },
    },
  ];

  return repository.save(entity);
}
