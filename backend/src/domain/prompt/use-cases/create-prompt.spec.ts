import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PromptEntity } from '../../database/entities/prompt';
import { PromptCategoryEntity } from '../../database/entities/prompt-category';
import { VisibilityType } from '../interfaces';
import { CreatePrompt, CreatePromptHandler } from './create-prompt';

describe('Create Prompt', () => {
  let handler: CreatePromptHandler;
  let promptRepository: Repository<PromptEntity>;
  let categoryRepository: Repository<PromptCategoryEntity>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatePromptHandler,
        {
          provide: getRepositoryToken(PromptEntity),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PromptCategoryEntity),
          useValue: {
            findBy: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<CreatePromptHandler>(CreatePromptHandler);
    promptRepository = module.get<Repository<PromptEntity>>(getRepositoryToken(PromptEntity));
    categoryRepository = module.get<Repository<PromptCategoryEntity>>(getRepositoryToken(PromptCategoryEntity));
  });

  it('should create a prompt without categories', async () => {
    const mockPromptEntity = {
      id: 1,
      title: 'Test Prompt',
      content: 'Test content',
      visibility: VisibilityType.PRIVATE,
    } as PromptEntity;

    const createSpy = jest.spyOn(promptRepository, 'create').mockReturnValue(mockPromptEntity);
    const saveSpy = jest.spyOn(promptRepository, 'save').mockResolvedValue(mockPromptEntity);

    const result = await handler.execute(
      new CreatePrompt({
        title: 'Test Prompt',
        content: 'Test content',
        visibility: VisibilityType.PRIVATE,
      }),
    );

    expect(createSpy).toHaveBeenCalledWith({
      title: 'Test Prompt',
      content: 'Test content',
      visibility: VisibilityType.PRIVATE,
      categories: [],
    });
    expect(saveSpy).toHaveBeenCalledWith(mockPromptEntity);
    expect(result.prompt).toEqual(mockPromptEntity);
  });

  it('should create a prompt with categories', async () => {
    const mockCategories = [
      { label: 'category1', description: 'Category 1' },
      { label: 'category2', description: 'Category 2' },
    ] as PromptCategoryEntity[];

    const mockPromptEntity = {
      id: 1,
      title: 'Test Prompt',
      content: 'Test content',
      visibility: VisibilityType.PUBLIC,
      categories: mockCategories,
    } as PromptEntity;

    const findBySpy = jest.spyOn(categoryRepository, 'findBy').mockResolvedValue(mockCategories);
    const createSpy = jest.spyOn(promptRepository, 'create').mockReturnValue(mockPromptEntity);
    const saveSpy = jest.spyOn(promptRepository, 'save').mockResolvedValue(mockPromptEntity);

    const result = await handler.execute(
      new CreatePrompt({
        title: 'Test Prompt',
        content: 'Test content',
        visibility: VisibilityType.PUBLIC,
        categoryLabels: ['category1', 'category2'],
      }),
    );

    expect(findBySpy).toHaveBeenCalledWith({
      label: In(['category1', 'category2']),
    });
    expect(createSpy).toHaveBeenCalledWith({
      title: 'Test Prompt',
      content: 'Test content',
      visibility: VisibilityType.PUBLIC,
      categories: mockCategories,
    });
    expect(saveSpy).toHaveBeenCalledWith(mockPromptEntity);
    expect(result.prompt).toEqual(mockPromptEntity);
  });

  it('should create prompt with only required fields', async () => {
    const mockPromptEntity = {
      id: 1,
      title: 'Required Title',
      content: 'Test content',
      visibility: VisibilityType.PRIVATE,
    } as PromptEntity;

    const createSpy = jest.spyOn(promptRepository, 'create').mockReturnValue(mockPromptEntity);
    const saveSpy = jest.spyOn(promptRepository, 'save').mockResolvedValue(mockPromptEntity);

    const result = await handler.execute(
      new CreatePrompt({
        title: 'Required Title',
        content: 'Test content',
        visibility: VisibilityType.PRIVATE,
      }),
    );

    expect(createSpy).toHaveBeenCalledWith({
      title: 'Required Title',
      content: 'Test content',
      visibility: VisibilityType.PRIVATE,
      categories: [],
    });
    expect(saveSpy).toHaveBeenCalledWith(mockPromptEntity);
    expect(result.prompt).toEqual(mockPromptEntity);
  });
});
