import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConfigurationEntity, ConfigurationStatus, ExtensionEntity } from '../../database';
import { ChatSuggestion } from '../../shared';
import { Extension, ExtensionObjectArgument, ExtensionStringArgument } from '../interfaces';
import { ExplorerService } from '../services';
import { PortableConfiguration } from './export-configuration';
import { ImportConfiguration, ImportConfigurationHandler } from './import-configuration';

interface MockQueryRunner {
  connect: jest.Mock;
  startTransaction: jest.Mock;
  commitTransaction: jest.Mock;
  rollbackTransaction: jest.Mock;
  release: jest.Mock;
  manager: {
    save: jest.Mock;
    findBy: jest.Mock;
  };
}

interface MockDataSource {
  createQueryRunner: jest.Mock;
  manager: {
    findOne: jest.Mock;
  };
}

describe(ImportConfiguration.name, () => {
  let handler: ImportConfigurationHandler;
  let dataSource: MockDataSource;
  let queryRunner: MockQueryRunner;
  let explorer: ExplorerService;

  beforeEach(() => {
    explorer = {
      getExtension: jest.fn(),
    } as unknown as ExplorerService;

    queryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      manager: {
        save: jest.fn(),
        findBy: jest.fn().mockResolvedValue([]),
      },
    };

    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
      manager: {
        findOne: jest.fn(),
      },
    };

    handler = new ImportConfigurationHandler(dataSource as unknown as DataSource, explorer);
  });

  it('should throw BadRequestException when extension is not available', async () => {
    jest.spyOn(explorer, 'getExtension').mockReturnValue(undefined);

    const importData: PortableConfiguration = {
      name: 'Test Config',
      description: 'Test',
      enabled: true,
      userGroupIds: [],
      extensions: [
        {
          name: 'non-existent-extension',
          enabled: true,
          values: {},
        },
      ],
    };

    await expect(handler.execute(new ImportConfiguration(importData))).rejects.toThrow(BadRequestException);
    await expect(handler.execute(new ImportConfiguration(importData))).rejects.toThrow(
      'The following extensions are not available in this system: non-existent-extension',
    );
  });

  it('should throw BadRequestException when multiple extensions are not available', async () => {
    jest.spyOn(explorer, 'getExtension').mockReturnValue(undefined);

    const importData: PortableConfiguration = {
      name: 'Test Config',
      description: 'Test',
      enabled: true,
      userGroupIds: [],
      extensions: [
        {
          name: 'extension-1',
          enabled: true,
          values: {},
        },
        {
          name: 'extension-2',
          enabled: true,
          values: {},
        },
      ],
    };

    await expect(handler.execute(new ImportConfiguration(importData))).rejects.toThrow(
      'The following extensions are not available in this system: extension-1, extension-2',
    );
  });

  it('should throw BadRequestException when extension configuration has missing required field', async () => {
    jest.spyOn(explorer, 'getExtension').mockReturnValue({
      spec: {
        name: 'test-extension',
        arguments: {
          requiredField: {
            type: 'string',
            required: true,
          } as ExtensionStringArgument,
        },
        title: 'Test Extension',
        description: 'Test',
        type: 'tool',
      },
      getMiddlewares: () => Promise.resolve([]),
    } as Extension);

    const importData: PortableConfiguration = {
      name: 'Test Config',
      description: 'Test',
      enabled: true,
      userGroupIds: [],
      extensions: [
        {
          name: 'test-extension',
          enabled: true,
          values: {}, // Missing required field
        },
      ],
    };

    await expect(handler.execute(new ImportConfiguration(importData))).rejects.toThrow(BadRequestException);
    await expect(handler.execute(new ImportConfiguration(importData))).rejects.toThrow(
      'Invalid configuration for extension "test-extension"',
    );
  });

  it('should throw BadRequestException when extension configuration has invalid data type', async () => {
    jest.spyOn(explorer, 'getExtension').mockReturnValue({
      spec: {
        name: 'test-extension',
        arguments: {
          numericField: {
            type: 'number',
            title: 'Numeric Field',
            required: true,
          },
        },
        title: 'Test Extension',
        description: 'Test',
        type: 'tool',
      },
      getMiddlewares: () => Promise.resolve([]),
    } as Extension);

    const importData: PortableConfiguration = {
      name: 'Test Config',
      description: 'Test',
      enabled: true,
      userGroupIds: [],
      extensions: [
        {
          name: 'test-extension',
          enabled: true,
          values: {
            numericField: 'not-a-number', // Wrong type
          },
        },
      ],
    };

    await expect(handler.execute(new ImportConfiguration(importData))).rejects.toThrow(BadRequestException);
    await expect(handler.execute(new ImportConfiguration(importData))).rejects.toThrow(
      'Invalid configuration for extension "test-extension"',
    );
  });

  it('should throw BadRequestException when extension configuration violates constraints', async () => {
    jest.spyOn(explorer, 'getExtension').mockReturnValue({
      spec: {
        name: 'test-extension',
        arguments: {
          limitedNumber: {
            type: 'number',
            title: 'Limited Number',
            required: true,
            minimum: 1,
            maximum: 10,
          },
        },
        title: 'Test Extension',
        description: 'Test',
        type: 'tool',
      },
      getMiddlewares: () => Promise.resolve([]),
    } as Extension);

    const importData: PortableConfiguration = {
      name: 'Test Config',
      description: 'Test',
      enabled: true,
      userGroupIds: [],
      extensions: [
        {
          name: 'test-extension',
          enabled: true,
          values: {
            limitedNumber: 100, // Exceeds maximum
          },
        },
      ],
    };

    await expect(handler.execute(new ImportConfiguration(importData))).rejects.toThrow(BadRequestException);
    await expect(handler.execute(new ImportConfiguration(importData))).rejects.toThrow(
      'Invalid configuration for extension "test-extension"',
    );
  });

  it('should successfully import configuration with valid data', async () => {
    const mockUserGroups = [{ id: 'group1', name: 'Group 1' }];

    const savedConfiguration: Partial<ConfigurationEntity> = {
      id: 1,
      name: 'Imported Config',
      description: 'Imported Description',
      status: ConfigurationStatus.ENABLED,
      agentName: 'Test Agent',
      chatFooter: 'Footer',
      chatSuggestions: [{ text: 'Hello', title: 'Hello', subtitle: 'Greeting' }] as ChatSuggestion[],
      executorEndpoint: undefined,
      executorHeaders: undefined,
      userGroupIds: ['group1'],
      extensions: [],
    };

    jest.spyOn(queryRunner.manager, 'findBy').mockResolvedValue(mockUserGroups);
    jest.spyOn(queryRunner.manager, 'save').mockImplementation((entity, data) => {
      if (entity === ConfigurationEntity) {
        return Promise.resolve(savedConfiguration);
      }
      return Promise.resolve(data);
    });
    jest.spyOn(dataSource.manager, 'findOne').mockResolvedValue({
      ...savedConfiguration,
      extensions: [
        {
          id: 1,
          name: 'test-extension',
          enabled: true,
          values: { key: 'value' },
        } as Partial<ExtensionEntity>,
      ],
    });

    jest.spyOn(explorer, 'getExtension').mockImplementation((name) => {
      return {
        spec: {
          name,
          arguments: {
            key: {
              type: 'string',
              required: true,
            } as ExtensionStringArgument,
          },
          title: 'Test Extension',
          description: 'Test',
          type: 'tool',
        },
        getMiddlewares: () => Promise.resolve([]),
      } as Extension;
    });

    const importData: PortableConfiguration = {
      name: 'Imported Config',
      description: 'Imported Description',
      enabled: true,
      agentName: 'Test Agent',
      chatFooter: 'Footer',
      chatSuggestions: [{ text: 'Hello', title: 'Hello', subtitle: 'Greeting' }] as ChatSuggestion[],
      userGroupIds: ['group1'],
      extensions: [
        {
          name: 'test-extension',
          enabled: true,
          values: { key: 'value' },
        },
      ],
    };

    const result = await handler.execute(new ImportConfiguration(importData));

    expect(result).toBeDefined();
    expect(result.configuration).toBeDefined();
    expect(result.configuration.name).toBe('Imported Config');
    expect(result.configuration.enabled).toBe(true);
    expect(queryRunner.manager.save).toHaveBeenCalled();
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
  });

  it('should import disabled configuration correctly', async () => {
    const savedConfiguration: Partial<ConfigurationEntity> = {
      id: 2,
      name: 'Disabled Config',
      description: 'Test',
      status: ConfigurationStatus.DISABLED,
      agentName: undefined,
      chatFooter: undefined,
      chatSuggestions: undefined,
      executorEndpoint: undefined,
      executorHeaders: undefined,
      userGroupIds: [],
      extensions: [],
    };

    jest.spyOn(queryRunner.manager, 'save').mockImplementation((entity, data) => {
      if (entity === ConfigurationEntity) {
        return Promise.resolve(savedConfiguration);
      }
      return Promise.resolve(data);
    });
    jest.spyOn(dataSource.manager, 'findOne').mockResolvedValue(savedConfiguration);
    jest.spyOn(explorer, 'getExtension').mockReturnValue({
      spec: {
        name: 'test',
        arguments: {},
        title: 'Test',
        description: 'Test',
        type: 'tool',
      },
      getMiddlewares: () => Promise.resolve([]),
    } as Extension);

    const importData: PortableConfiguration = {
      name: 'Disabled Config',
      description: 'Test',
      enabled: false,
      userGroupIds: [],
      extensions: [],
    };

    const result = await handler.execute(new ImportConfiguration(importData));

    expect(result.configuration.enabled).toBe(false);
    const mockCalls = queryRunner.manager.save.mock.calls as [[typeof ConfigurationEntity, ConfigurationEntity]];
    const savedEntity = mockCalls[0][1];
    expect(savedEntity.status).toBe(ConfigurationStatus.DISABLED);
  });

  it('should create extensions with correct externalId', async () => {
    const savedConfiguration: Partial<ConfigurationEntity> = {
      id: 5,
      name: 'Test Config',
      description: 'Test',
      status: ConfigurationStatus.ENABLED,
      agentName: undefined,
      chatFooter: undefined,
      chatSuggestions: undefined,
      executorEndpoint: undefined,
      executorHeaders: undefined,
      userGroupIds: [],
      extensions: [],
    };

    let savedExtensions: ExtensionEntity[] = [];
    jest.spyOn(queryRunner.manager, 'save').mockImplementation((entity, data) => {
      if (entity === ConfigurationEntity) {
        return Promise.resolve(savedConfiguration);
      }
      if (entity === ExtensionEntity) {
        savedExtensions = data as ExtensionEntity[];
        return Promise.resolve(data);
      }
      return Promise.resolve(data);
    });
    jest.spyOn(dataSource.manager, 'findOne').mockResolvedValue({
      ...savedConfiguration,
      extensions: [],
    });

    jest.spyOn(explorer, 'getExtension').mockReturnValue({
      spec: {
        name: 'test-ext',
        arguments: {},
        title: 'Test',
        description: 'Test',
        type: 'tool',
      },
      getMiddlewares: () => Promise.resolve([]),
    } as Extension);

    const importData: PortableConfiguration = {
      name: 'Test Config',
      description: 'Test',
      enabled: true,
      userGroupIds: [],
      extensions: [
        {
          name: 'test-ext',
          enabled: true,
          values: {},
        },
      ],
    };

    await handler.execute(new ImportConfiguration(importData));

    expect(savedExtensions[0].externalId).toBe('5-test-ext');
  });

  it('should handle configurable arguments correctly', async () => {
    const temperatureArg: ExtensionObjectArgument = {
      type: 'object',
      title: 'Configurable Args',
      properties: {
        temperature: {
          type: 'number',
          title: 'Temperature',
        },
      },
    };

    const savedConfiguration: Partial<ConfigurationEntity> = {
      id: 6,
      name: 'Config with args',
      description: 'Test',
      status: ConfigurationStatus.ENABLED,
      agentName: undefined,
      chatFooter: undefined,
      chatSuggestions: undefined,
      executorEndpoint: undefined,
      executorHeaders: undefined,
      userGroupIds: [],
      extensions: [],
    };

    let savedExtensions: ExtensionEntity[] = [];
    jest.spyOn(queryRunner.manager, 'save').mockImplementation((entity, data) => {
      if (entity === ConfigurationEntity) {
        return Promise.resolve(savedConfiguration);
      }
      if (entity === ExtensionEntity) {
        savedExtensions = data as ExtensionEntity[];
        return Promise.resolve(data);
      }
      return Promise.resolve(data);
    });
    jest.spyOn(dataSource.manager, 'findOne').mockResolvedValue({
      ...savedConfiguration,
      extensions: [
        {
          id: 1,
          name: 'test-extension',
          enabled: true,
          values: {},
          configurableArguments: temperatureArg,
        } as Partial<ExtensionEntity>,
      ],
    });

    jest.spyOn(explorer, 'getExtension').mockReturnValue({
      spec: {
        name: 'test-extension',
        arguments: {},
        title: 'Test',
        description: 'Test',
        type: 'llm',
      },
      getMiddlewares: () => Promise.resolve([]),
    } as Extension);

    const importData: PortableConfiguration = {
      name: 'Config with args',
      description: 'Test',
      enabled: true,
      userGroupIds: [],
      extensions: [
        {
          name: 'test-extension',
          enabled: true,
          values: {},
          configurableArguments: temperatureArg,
        },
      ],
    };

    await handler.execute(new ImportConfiguration(importData));

    expect(savedExtensions[0].configurableArguments).toEqual(temperatureArg);
  });

  it('should warn when importing configuration from different version', async () => {
    const savedConfiguration: Partial<ConfigurationEntity> = {
      id: 7,
      name: 'Config from different version',
      description: 'Test',
      status: ConfigurationStatus.ENABLED,
      agentName: undefined,
      chatFooter: undefined,
      chatSuggestions: undefined,
      executorEndpoint: undefined,
      executorHeaders: undefined,
      userGroupIds: [],
      extensions: [],
    };

    jest.spyOn(queryRunner.manager, 'save').mockImplementation((entity, data) => {
      if (entity === ConfigurationEntity) {
        return Promise.resolve(savedConfiguration);
      }
      return Promise.resolve(data);
    });
    jest.spyOn(dataSource.manager, 'findOne').mockResolvedValue(savedConfiguration);
    jest.spyOn(explorer, 'getExtension').mockReturnValue({
      spec: {
        name: 'test',
        arguments: {},
        title: 'Test',
        description: 'Test',
        type: 'tool',
      },
      getMiddlewares: () => Promise.resolve([]),
    } as Extension);

    // Set current VERSION
    process.env.VERSION = '2.0.0';

    const importData: PortableConfiguration = {
      version: '1.0.0', // Different version
      name: 'Config from different version',
      description: 'Test',
      enabled: true,
      userGroupIds: [],
      extensions: [],
    };

    const loggerWarnSpy = jest.spyOn(handler['logger'], 'warn');

    await handler.execute(new ImportConfiguration(importData));

    expect(loggerWarnSpy).toHaveBeenCalledWith(expect.stringContaining('from version 1.0.0, but current version is 2.0.0'));

    // Clean up
    delete process.env.VERSION;
  });

  it('should not warn when importing configuration from same version', async () => {
    const savedConfiguration: Partial<ConfigurationEntity> = {
      id: 8,
      name: 'Config from same version',
      description: 'Test',
      status: ConfigurationStatus.ENABLED,
      agentName: undefined,
      chatFooter: undefined,
      chatSuggestions: undefined,
      executorEndpoint: undefined,
      executorHeaders: undefined,
      userGroupIds: [],
      extensions: [],
    };

    jest.spyOn(queryRunner.manager, 'save').mockImplementation((entity, data) => {
      if (entity === ConfigurationEntity) {
        return Promise.resolve(savedConfiguration);
      }
      return Promise.resolve(data);
    });
    jest.spyOn(dataSource.manager, 'findOne').mockResolvedValue(savedConfiguration);
    jest.spyOn(explorer, 'getExtension').mockReturnValue({
      spec: {
        name: 'test',
        arguments: {},
        title: 'Test',
        description: 'Test',
        type: 'tool',
      },
      getMiddlewares: () => Promise.resolve([]),
    } as Extension);

    // Set current VERSION
    process.env.VERSION = '2.0.0';

    const importData: PortableConfiguration = {
      version: '2.0.0', // Same version
      name: 'Config from same version',
      description: 'Test',
      enabled: true,
      userGroupIds: [],
      extensions: [],
    };

    const loggerWarnSpy = jest.spyOn(handler['logger'], 'warn');

    await handler.execute(new ImportConfiguration(importData));

    expect(loggerWarnSpy).not.toHaveBeenCalled();

    // Clean up
    delete process.env.VERSION;
  });

  it('should preserve all values including masked ones during import', async () => {
    const savedConfiguration: Partial<ConfigurationEntity> = {
      id: 9,
      name: 'Config with masked nested values',
      description: 'Test',
      status: ConfigurationStatus.ENABLED,
      agentName: undefined,
      chatFooter: undefined,
      chatSuggestions: undefined,
      executorEndpoint: undefined,
      executorHeaders: undefined,
      userGroupIds: [],
      extensions: [],
    };

    let savedExtensions: ExtensionEntity[] = [];
    jest.spyOn(queryRunner.manager, 'save').mockImplementation((entity, data) => {
      if (entity === ConfigurationEntity) {
        return Promise.resolve(savedConfiguration);
      }
      if (entity === ExtensionEntity) {
        savedExtensions = data as ExtensionEntity[];
        return Promise.resolve(data);
      }
      return Promise.resolve(data);
    });
    jest.spyOn(dataSource.manager, 'findOne').mockResolvedValue({
      ...savedConfiguration,
      extensions: [],
    });

    jest.spyOn(explorer, 'getExtension').mockReturnValue({
      spec: {
        name: 'test-extension',
        arguments: {
          apiKey: {
            type: 'string',
            format: 'password',
            required: false,
          } as ExtensionStringArgument,
          nested: {
            type: 'object',
            title: 'Nested Object',
            properties: {
              secretKey: {
                type: 'string',
                format: 'password',
                required: false,
              } as ExtensionStringArgument,
              publicValue: {
                type: 'string',
                required: true,
              } as ExtensionStringArgument,
            },
            required: false,
          },
        },
        title: 'Test',
        description: 'Test',
        type: 'tool',
      },
      getMiddlewares: () => Promise.resolve([]),
    } as Extension);

    const importData: PortableConfiguration = {
      name: 'Config with masked nested values',
      description: 'Test',
      enabled: true,
      userGroupIds: [],
      extensions: [
        {
          name: 'test-extension',
          enabled: true,
          values: {
            apiKey: '********************', // Masked - preserved as-is (user must re-enter)
            endpoint: 'https://api.example.com',
            nested: {
              secretKey: '********************', // Masked - preserved as-is (user must re-enter)
              publicValue: 'public',
            },
          },
        },
      ],
    };

    await handler.execute(new ImportConfiguration(importData));

    // All values are preserved as-is during import - user must manually update secrets
    expect(savedExtensions[0].values.apiKey).toBe('********************');
    expect(savedExtensions[0].values.endpoint).toBe('https://api.example.com');
    const nestedValues = savedExtensions[0].values.nested as Record<string, unknown>;
    expect(nestedValues.secretKey).toBe('********************');
    expect(nestedValues.publicValue).toBe('public');
  });

  it('should include exportedAt timestamp in import data', async () => {
    const savedConfiguration: Partial<ConfigurationEntity> = {
      id: 10,
      name: 'Config with timestamp',
      description: 'Test',
      status: ConfigurationStatus.ENABLED,
      agentName: undefined,
      chatFooter: undefined,
      chatSuggestions: undefined,
      executorEndpoint: undefined,
      executorHeaders: undefined,
      userGroupIds: [],
      extensions: [],
    };

    jest.spyOn(queryRunner.manager, 'save').mockImplementation((entity, data) => {
      if (entity === ConfigurationEntity) {
        return Promise.resolve(savedConfiguration);
      }
      return Promise.resolve(data);
    });
    jest.spyOn(dataSource.manager, 'findOne').mockResolvedValue(savedConfiguration);
    jest.spyOn(explorer, 'getExtension').mockReturnValue({
      spec: {
        name: 'test',
        arguments: {},
        title: 'Test',
        description: 'Test',
        type: 'tool',
      },
      getMiddlewares: () => Promise.resolve([]),
    } as Extension);

    const exportedAt = new Date().toISOString();

    const importData: PortableConfiguration = {
      version: '1.0.0',
      exportedAt,
      name: 'Config with timestamp',
      description: 'Test',
      enabled: true,
      userGroupIds: [],
      extensions: [],
    };

    const result = await handler.execute(new ImportConfiguration(importData));

    expect(result).toBeDefined();
    expect(result.configuration.name).toBe('Config with timestamp');
  });

  it('should throw BadRequestException when none of the specified user groups exist', async () => {
    jest.spyOn(explorer, 'getExtension').mockReturnValue({
      spec: {
        name: 'test',
        arguments: {},
        title: 'Test',
        description: 'Test',
        type: 'tool',
      },
      getMiddlewares: () => Promise.resolve([]),
    } as Extension);

    // No user groups found
    jest.spyOn(queryRunner.manager, 'findBy').mockResolvedValue([]);

    const importData: PortableConfiguration = {
      name: 'Config with invalid groups',
      description: 'Test',
      enabled: true,
      userGroupIds: ['non-existent-group-1', 'non-existent-group-2'],
      extensions: [],
    };

    await expect(handler.execute(new ImportConfiguration(importData))).rejects.toThrow(BadRequestException);
    await expect(handler.execute(new ImportConfiguration(importData))).rejects.toThrow(
      'Cannot import configuration: none of the specified user groups exist in this system',
    );
  });

  it('should successfully import configuration when all user groups exist', async () => {
    const mockUserGroups = [
      { id: 'group-1', name: 'Group 1' },
      { id: 'group-2', name: 'Group 2' },
    ];

    const savedConfiguration: Partial<ConfigurationEntity> = {
      id: 11,
      name: 'Config with valid groups',
      description: 'Test',
      status: ConfigurationStatus.ENABLED,
      agentName: undefined,
      chatFooter: undefined,
      chatSuggestions: undefined,
      executorEndpoint: undefined,
      executorHeaders: undefined,
      userGroupIds: ['group-1', 'group-2'],
      extensions: [],
    };

    jest.spyOn(queryRunner.manager, 'findBy').mockResolvedValue(mockUserGroups);
    jest.spyOn(queryRunner.manager, 'save').mockImplementation((entity, data) => {
      if (entity === ConfigurationEntity) {
        return Promise.resolve(savedConfiguration);
      }
      return Promise.resolve(data);
    });
    jest.spyOn(dataSource.manager, 'findOne').mockResolvedValue(savedConfiguration);
    jest.spyOn(explorer, 'getExtension').mockReturnValue({
      spec: {
        name: 'test',
        arguments: {},
        title: 'Test',
        description: 'Test',
        type: 'tool',
      },
      getMiddlewares: () => Promise.resolve([]),
    } as Extension);

    const importData: PortableConfiguration = {
      name: 'Config with valid groups',
      description: 'Test',
      enabled: true,
      userGroupIds: ['group-1', 'group-2'],
      extensions: [],
    };

    const result = await handler.execute(new ImportConfiguration(importData));

    expect(result).toBeDefined();
    expect(result.configuration.name).toBe('Config with valid groups');
    expect(queryRunner.manager.save).toHaveBeenCalledWith(
      ConfigurationEntity,
      expect.objectContaining({
        userGroups: mockUserGroups,
      }),
    );
  });

  it('should warn and proceed when some user groups are missing', async () => {
    const mockUserGroups = [{ id: 'group-1', name: 'Group 1' }];

    const savedConfiguration: Partial<ConfigurationEntity> = {
      id: 12,
      name: 'Config with partial groups',
      description: 'Test',
      status: ConfigurationStatus.ENABLED,
      agentName: undefined,
      chatFooter: undefined,
      chatSuggestions: undefined,
      executorEndpoint: undefined,
      executorHeaders: undefined,
      userGroupIds: ['group-1'],
      extensions: [],
    };

    // Only one of two groups found
    jest.spyOn(queryRunner.manager, 'findBy').mockResolvedValue(mockUserGroups);
    jest.spyOn(queryRunner.manager, 'save').mockImplementation((entity, data) => {
      if (entity === ConfigurationEntity) {
        return Promise.resolve(savedConfiguration);
      }
      return Promise.resolve(data);
    });
    jest.spyOn(dataSource.manager, 'findOne').mockResolvedValue(savedConfiguration);
    jest.spyOn(explorer, 'getExtension').mockReturnValue({
      spec: {
        name: 'test',
        arguments: {},
        title: 'Test',
        description: 'Test',
        type: 'tool',
      },
      getMiddlewares: () => Promise.resolve([]),
    } as Extension);

    const loggerWarnSpy = jest.spyOn(handler['logger'], 'warn');

    const importData: PortableConfiguration = {
      name: 'Config with partial groups',
      description: 'Test',
      enabled: true,
      userGroupIds: ['group-1', 'missing-group'],
      extensions: [],
    };

    const result = await handler.execute(new ImportConfiguration(importData));

    expect(result).toBeDefined();
    expect(loggerWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Missing: missing-group'));
    expect(queryRunner.manager.save).toHaveBeenCalledWith(
      ConfigurationEntity,
      expect.objectContaining({
        userGroups: mockUserGroups,
      }),
    );
  });

  it('should import configuration without user groups when none specified', async () => {
    const savedConfiguration: Partial<ConfigurationEntity> = {
      id: 13,
      name: 'Config without groups',
      description: 'Test',
      status: ConfigurationStatus.ENABLED,
      agentName: undefined,
      chatFooter: undefined,
      chatSuggestions: undefined,
      executorEndpoint: undefined,
      executorHeaders: undefined,
      userGroupIds: [],
      extensions: [],
    };

    jest.spyOn(queryRunner.manager, 'save').mockImplementation((entity, data) => {
      if (entity === ConfigurationEntity) {
        return Promise.resolve(savedConfiguration);
      }
      return Promise.resolve(data);
    });
    jest.spyOn(dataSource.manager, 'findOne').mockResolvedValue(savedConfiguration);
    jest.spyOn(explorer, 'getExtension').mockReturnValue({
      spec: {
        name: 'test',
        arguments: {},
        title: 'Test',
        description: 'Test',
        type: 'tool',
      },
      getMiddlewares: () => Promise.resolve([]),
    } as Extension);

    const importData: PortableConfiguration = {
      name: 'Config without groups',
      description: 'Test',
      enabled: true,
      extensions: [],
    };

    const result = await handler.execute(new ImportConfiguration(importData));

    expect(result).toBeDefined();
    expect(queryRunner.manager.findBy).not.toHaveBeenCalled();
    expect(queryRunner.manager.save).toHaveBeenCalledWith(
      ConfigurationEntity,
      expect.objectContaining({
        userGroups: [],
      }),
    );
  });
});
