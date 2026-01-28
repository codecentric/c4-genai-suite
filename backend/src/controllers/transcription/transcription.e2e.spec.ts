import { Server } from 'net';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module';
import { ConfigurationEntity, ConfigurationStatus, ExtensionEntity, UserEntity } from '../../domain/database';
import { schema } from '../../domain/database/typeorm.helper';
import { initAppWithDataBaseAndValidUser } from '../../utils/testUtils';
import { TranscriptionController } from './transcription.controller';

// Mock the Azure provider
jest.mock('../../domain/transcription/providers/azure-provider', () => {
  return {
    AzureTranscriptionProvider: jest.fn().mockImplementation(() => {
      return {
        transcribe: jest.fn().mockResolvedValue('This is a mocked transcription result'),
      };
    }),
  };
});

describe('Transcription', () => {
  let app: INestApplication<Server>;
  let dataSource: DataSource;
  let controller: TranscriptionController;
  let extensionId: number;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    controller = module.get(TranscriptionController);

    const initialized = await initAppWithDataBaseAndValidUser(dataSource, module, app);
    dataSource = initialized.dataSource;
    app = initialized.app;
    await cleanDatabase(dataSource);
    await seedTestData(dataSource);
    extensionId = await createDictateExtension(dataSource);
  });

  afterAll(async () => {
    await cleanDatabase(dataSource);
    await dataSource.destroy();
    await app.close();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should transcribe audio file successfully', async () => {
    const audioBuffer = Buffer.from('fake-audio-data');
    const fileName = 'test-audio.mp3';

    const response = await request(app.getHttpServer())
      .post(`/transcription?extensionId=${extensionId}`)
      .set('Content-Type', 'multipart/form-data')
      .attach('audio', audioBuffer, fileName)
      .expect(HttpStatus.CREATED);

    expect(response.body).toHaveProperty('text');
    expect((response.body as { text: string }).text).toBe('This is a mocked transcription result');
  });

  it('should return 400 when no audio file is provided', async () => {
    await request(app.getHttpServer())
      .post(`/transcription?extensionId=${extensionId}`)
      .set('Content-Type', 'multipart/form-data')
      .expect(HttpStatus.BAD_REQUEST);
  });

  it('should return 400 when extensionId is missing', async () => {
    const audioBuffer = Buffer.from('fake-audio-data');
    const fileName = 'test-audio.mp3';

    await request(app.getHttpServer())
      .post('/transcription')
      .set('Content-Type', 'multipart/form-data')
      .attach('audio', audioBuffer, fileName)
      .expect(HttpStatus.BAD_REQUEST);
  });

  it('should return 400 when extensionId is invalid', async () => {
    const audioBuffer = Buffer.from('fake-audio-data');
    const fileName = 'test-audio.mp3';

    await request(app.getHttpServer())
      .post('/transcription?extensionId=invalid')
      .set('Content-Type', 'multipart/form-data')
      .attach('audio', audioBuffer, fileName)
      .expect(HttpStatus.BAD_REQUEST);
  });

  it('should return 404 when extension does not exist', async () => {
    const nonExistentExtensionId = 99999;
    const audioBuffer = Buffer.from('fake-audio-data');
    const fileName = 'test-audio.mp3';

    await request(app.getHttpServer())
      .post(`/transcription?extensionId=${nonExistentExtensionId}`)
      .set('Content-Type', 'multipart/form-data')
      .attach('audio', audioBuffer, fileName)
      .expect(HttpStatus.NOT_FOUND);
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

  const userEntity = new UserEntity();
  userEntity.id = '1';
  userEntity.name = 'test-user';
  userEntity.email = 'test@example.com';
  await userRepository.save(userEntity);

  const configurationEntity = new ConfigurationEntity();
  configurationEntity.name = 'Test Configuration';
  configurationEntity.status = ConfigurationStatus.ENABLED;
  await configurationRepository.save(configurationEntity);
}

async function createDictateExtension(dataSource: DataSource): Promise<number> {
  const configRepo = dataSource.getRepository(ConfigurationEntity);
  const extensionRepo = dataSource.getRepository(ExtensionEntity);

  const config = await configRepo.findOneBy({ id: 1 });
  if (!config) {
    throw new Error('Configuration not found');
  }

  const extension = extensionRepo.create({
    name: 'transcribe',
    enabled: true,
    configuration: config,
    values: {
      apiKey: 'test-api-key',
      instanceName: 'test-instance',
      deploymentName: 'whisper',
      language: 'en',
      apiVersion: '2024-06-01',
    },
  });

  const saved = await extensionRepo.save(extension);
  return saved.id;
}
