import { Extension } from 'src/domain/extensions';
import {
  BucketEntity,
  BucketRepository,
  BucketType,
  ConfigurationEntity,
  ExtensionEntity,
  ExtensionRepository,
} from '../../database';
import { ExplorerService } from '../services';
import { GetBucketAvailability, GetBucketAvailabilityHandler } from './get-bucket-availability';

describe('Get Bucket Availability By Type', () => {
  let extensionRepository: ExtensionRepository;
  let bucketRepository: BucketRepository;
  let handler: GetBucketAvailabilityHandler;
  let explorer: ExplorerService;

  beforeEach(() => {
    explorer = {
      getExtension: jest.fn(),
    } as unknown as ExplorerService;
    bucketRepository = {
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as BucketRepository;
    extensionRepository = {
      findOneBy: jest.fn(),
      findBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as ExtensionRepository;
    handler = new GetBucketAvailabilityHandler(explorer, extensionRepository, bucketRepository);
    jest.spyOn(explorer, 'getExtension').mockImplementation((name) => {
      return { spec: { name, arguments: {}, title: 'test', description: '', type: 'llm' } } as Extension;
    });
  });

  it('should be defined', () => {
    expect(GetBucketAvailability).toBeDefined();
  });
  it('should return false if no bucket is found', async () => {
    const response = await handler.execute(new GetBucketAvailability(1, 'user'));

    expect(response.extensions.length).toBe(0);
  });
  it('should return false if no user bucket with extension files is found', async () => {
    jest.spyOn(bucketRepository, 'findOneBy').mockResolvedValueOnce(createBucketEntityByType('user'));

    const response = await handler.execute(new GetBucketAvailability(1, 'user'));
    expect(response.extensions.length).toBe(0);
  });
  it('should return true if user bucket with extension files is found', async () => {
    jest.spyOn(bucketRepository, 'findOneBy').mockResolvedValueOnce(createBucketEntityByType('user'));

    jest.spyOn(extensionRepository, 'findBy').mockResolvedValueOnce([createExtensionEntity('files-42')]);

    const response = await handler.execute(new GetBucketAvailability(1, 'user'));

    expect(response.extensions.length).toBe(1);
    expect(response.extensions[0].extensionId).toBe(1);
  });
  it('should return false if conversation is requested and not found', async () => {
    jest.spyOn(bucketRepository, 'findOneBy').mockResolvedValueOnce(null);

    jest.spyOn(extensionRepository, 'findBy').mockResolvedValueOnce([createExtensionEntity('files-42')]);

    const response = await handler.execute(new GetBucketAvailability(1, 'conversation'));

    expect(response.extensions.length).toBe(0);
  });
  it('should return true if conversation bucket with files extension is found', async () => {
    jest.spyOn(bucketRepository, 'findOneBy').mockResolvedValueOnce(createBucketEntityByType('conversation'));
    jest.spyOn(extensionRepository, 'findBy').mockResolvedValueOnce([createExtensionEntity('files-conversation')]);

    const response = await handler.execute(new GetBucketAvailability(1, 'conversation'));

    expect(response.extensions.length).toBe(1);
    expect(response.extensions[0].extensionId).toBe(1);
  });
});

function createBucketEntityByType(type: BucketType): BucketEntity {
  return {
    id: 1,
    name: 'Test bucket',
    endpoint: 'http://localhost:8080',
    type: type,
    isDefault: false,
    perUserQuota: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    files: Promise.resolve([]),
    fileSizeLimits: { general: 1, pdf: 10 },
  };
}

function createExtensionEntity(name: string): ExtensionEntity {
  return {
    id: 1,
    externalId: '1',
    name,
    enabled: true,
    values: {
      bucket: 1,
    },
    configurationId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    configuration: {} as ConfigurationEntity,
  };
}
