import { Server } from 'net';
import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from '../../app.module';
import { PromptCategoryEntity } from '../../domain/database';
import { VisibilityType } from '../../domain/prompt';
import { initAppWithDataBaseAndValidUser } from '../../utils/testUtils';
import { CreatePromptDto, PromptDto } from './dtos';

describe('Prompts', () => {
  let app: INestApplication<Server>;
  let dataSource: DataSource;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const initialized = await initAppWithDataBaseAndValidUser(dataSource, module, app);
    dataSource = initialized.dataSource;
    app = initialized.app;
    await seedTestData(dataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  it('should create a prompt without categories', async () => {
    const newPrompt: CreatePromptDto = {
      title: 'Test Prompt',
      description: 'A test prompt for e2e testing',
      content: 'This is the prompt content for testing purposes.',
      visibility: VisibilityType.PUBLIC,
    };

    const response = await request(app.getHttpServer()).post('/prompt').send(newPrompt).expect(HttpStatus.CREATED);

    const typedBody = response.body as PromptDto;
    expect(typedBody.id).toBeDefined();
    expect(typedBody.title).toBe(newPrompt.title);
    expect(typedBody.description).toBe(newPrompt.description);
    expect(typedBody.content).toBe(newPrompt.content);
    expect(typedBody.visibility).toBe(newPrompt.visibility);
    expect(typedBody.categories).toEqual([]);
  });

  it('should create a prompt with categories', async () => {
    const newPrompt: CreatePromptDto = {
      title: 'Categorized Prompt',
      content: 'This prompt has categories.',
      visibility: VisibilityType.PRIVATE,
      categories: ['technical', 'creative'],
    };

    const response = await request(app.getHttpServer()).post('/prompt').send(newPrompt).expect(HttpStatus.CREATED);

    const typedBody = response.body as PromptDto;
    expect(typedBody.id).toBeDefined();
    expect(typedBody.title).toBe(newPrompt.title);
    expect(typedBody.content).toBe(newPrompt.content);
    expect(typedBody.visibility).toBe(newPrompt.visibility);
    expect(typedBody.categories).toHaveLength(2);
    expect(typedBody.categories).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: 'technical' }), expect.objectContaining({ label: 'creative' })]),
    );
  });

  it('should create a prompt with only required fields', async () => {
    const newPrompt: CreatePromptDto = {
      title: 'Minimal Prompt',
      content: 'This is a minimal prompt with only required fields.',
      visibility: VisibilityType.PRIVATE,
    };

    const response = await request(app.getHttpServer()).post('/prompt').send(newPrompt).expect(HttpStatus.CREATED);

    const typedBody = response.body as PromptDto;
    expect(typedBody.id).toBeDefined();
    expect(typedBody.title).toBe(newPrompt.title);
    expect(typedBody.content).toBe(newPrompt.content);
    expect(typedBody.visibility).toBe(newPrompt.visibility);
    expect(typedBody.description).toBeUndefined();
    expect(typedBody.rating).toBeUndefined();
    expect(typedBody.categories).toEqual([]);
  });

  it('should create a prompt with non-existent categories', async () => {
    const newPrompt: CreatePromptDto = {
      title: 'Prompt with Non-existent Categories',
      content: 'This prompt references categories that do not exist.',
      visibility: VisibilityType.PUBLIC,
      categories: ['nonexistent1', 'technical', 'nonexistent2'],
    };

    const response = await request(app.getHttpServer()).post('/prompt').send(newPrompt).expect(HttpStatus.CREATED);

    const typedBody = response.body as PromptDto;
    expect(typedBody.categories).toHaveLength(1); // Only 'technical' exists
    expect(typedBody.categories).toEqual([expect.objectContaining({ label: 'technical' })]);
  });

  it('should fail to create a prompt without required fields', async () => {
    const invalidPrompt = {
      description: 'Missing title and content',
      visibility: VisibilityType.PUBLIC,
    };

    await request(app.getHttpServer()).post('/prompt').send(invalidPrompt).expect(HttpStatus.BAD_REQUEST);
  });

  it('should fail to create a prompt with invalid visibility', async () => {
    const invalidPrompt = {
      title: 'Invalid Prompt',
      content: 'This prompt has invalid visibility.',
      visibility: 'invalid_visibility',
    };

    await request(app.getHttpServer()).post('/prompt').send(invalidPrompt).expect(HttpStatus.BAD_REQUEST);
  });
});

async function seedTestData(dataSource: DataSource) {
  const promptCategoryRepository = dataSource.getRepository(PromptCategoryEntity);

  // Create test categories
  await createPromptCategory('technical', 'Technical prompts', promptCategoryRepository);
  await createPromptCategory('creative', 'Creative writing prompts', promptCategoryRepository);
  await createPromptCategory('business', 'Business and professional prompts', promptCategoryRepository);
}

async function createPromptCategory(
  label: string,
  description: string,
  promptCategoryRepository: Repository<PromptCategoryEntity>,
): Promise<PromptCategoryEntity> {
  const categoryEntity = new PromptCategoryEntity();
  categoryEntity.label = label;
  categoryEntity.description = description;
  categoryEntity.creationDate = new Date();
  categoryEntity.visibility = VisibilityType.PUBLIC;
  return promptCategoryRepository.save(categoryEntity);
}
