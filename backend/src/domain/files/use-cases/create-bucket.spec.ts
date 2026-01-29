import { HttpException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditLogService } from 'src/domain/audit-log';
import { BucketEntity, BucketRepository } from '../../database';
import { CreateBucket, CreateBucketHandler, CreateBucketResponse } from './create-bucket';

const mockPerformedBy = { id: 'test-user', name: 'Test User' };

describe('Create Bucket', () => {
  let bucketRepository: BucketRepository;
  let handler: CreateBucketHandler;

  beforeAll(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateBucketHandler,
        {
          provide: getRepositoryToken(BucketEntity),
          useValue: {
            findOneBy: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: AuditLogService,
          useValue: {
            createAuditLog: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get(CreateBucketHandler);
    bucketRepository = module.get<BucketRepository>(getRepositoryToken(BucketEntity));
  });
  it('should create a new user bucket', async () => {
    jest.spyOn(bucketRepository, 'findOneBy').mockResolvedValueOnce(null);
    jest.spyOn(bucketRepository, 'create').mockReturnValueOnce({} as BucketEntity);
    jest.spyOn(bucketRepository, 'save').mockResolvedValueOnce({
      id: 1,
      name: 'bucket-user',
      type: 'user',
      endpoint: 'http://localhost:8080',
      perUserQuota: 20,
    } as BucketEntity);

    const command = new CreateBucket({
      name: 'bucket-user',
      type: 'user',
      endpoint: 'http://localhost:8080',
      perUserQuota: 20,
      isDefault: false,
      fileSizeLimits: { general: 1, pdf: 10 },
    }, mockPerformedBy);

    const response = await handler.execute(command);

    expect(response).toBeInstanceOf(CreateBucketResponse);
    expect(response.bucket).toBeDefined();
    expect(response.bucket.type).toBe('user');
  });
  it('should fail to create a new user bucket if one already exists', async () => {
    jest.spyOn(bucketRepository, 'findOneBy').mockResolvedValueOnce({ id: 1 } as BucketEntity);
    const command = new CreateBucket({
      name: 'bucket-user',
      type: 'user',
      endpoint: 'http://localhost:8080',
      perUserQuota: 20,
      isDefault: false,
      fileSizeLimits: { general: 1, pdf: 10 },
    }, mockPerformedBy);

    await expect(handler.execute(command)).rejects.toThrow(HttpException);
  });
  it('should create a new general bucket', async () => {
    jest.spyOn(bucketRepository, 'create').mockReturnValueOnce({} as BucketEntity);
    jest.spyOn(bucketRepository, 'save').mockResolvedValueOnce({
      id: 1,
      name: 'bucket-general',
      type: 'general',
      endpoint: 'http://localhost:8080',
      perUserQuota: 20,
    } as BucketEntity);

    const command = new CreateBucket({
      name: 'bucket-general',
      type: 'general',
      endpoint: 'http://localhost:8080',
      perUserQuota: 20,
      isDefault: false,
      fileSizeLimits: { general: 1, pdf: 10 },
    }, mockPerformedBy);

    const response = await handler.execute(command);

    expect(response.bucket).toBeDefined();
    expect(response.bucket.type).toBe('general');
  });
  it('should create a new conversation bucket', async () => {
    jest.spyOn(bucketRepository, 'create').mockReturnValueOnce({} as BucketEntity);
    jest.spyOn(bucketRepository, 'save').mockResolvedValueOnce({
      id: 1,
      name: 'bucket-conversation',
      type: 'conversation',
      endpoint: 'http://localhost:8080',
      perUserQuota: 0,
      isDefault: false,
    } as BucketEntity);

    const command = new CreateBucket({
      name: 'bucket-conversation',
      type: 'conversation',
      endpoint: 'http://localhost:8080',
      perUserQuota: 0,
      isDefault: false,
      fileSizeLimits: { general: 1, pdf: 10 },
    }, mockPerformedBy);

    const response = await handler.execute(command);

    expect(response.bucket).toBeDefined();
    expect(response.bucket.type).toBe('conversation');
  });
  it('should fail to create a new conversation bucket if one already exists', async () => {
    jest.spyOn(bucketRepository, 'findOneBy').mockResolvedValueOnce({ id: 1, type: 'conversation' } as BucketEntity);
    const command = new CreateBucket({
      name: 'bucket-conversation',
      type: 'conversation',
      endpoint: 'http://localhost:8080',
      perUserQuota: 0,
      isDefault: false,
      fileSizeLimits: { general: 1, pdf: 10 },
    }, mockPerformedBy);

    await expect(handler.execute(command)).rejects.toThrow(HttpException);
  });
});
