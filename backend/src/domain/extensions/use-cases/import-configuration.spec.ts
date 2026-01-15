/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { BadRequestException } from '@nestjs/common';
import { ConfigurationEntity, ConfigurationStatus, ExtensionEntity } from '../../database';
import { Extension, ExtensionStringArgument } from '../interfaces';
import { ExplorerService } from '../services';
import { ImportConfiguration, ImportConfigurationData, ImportConfigurationHandler } from './import-configuration';

describe(ImportConfiguration.name, () => {
  let handler: ImportConfigurationHandler;
  let configRepository: any;
  let extensionRepository: any;
  let explorer: ExplorerService;

  beforeEach(() => {
    explorer = {
      getExtension: jest.fn(),
    } as unknown as ExplorerService;

    configRepository = {
      save: jest.fn(),
      findOne: jest.fn(),
    };

    extensionRepository = {
      save: jest.fn(),
    };

    handler = new ImportConfigurationHandler(configRepository, extensionRepository, explorer);
  });

  it('should throw BadRequestException when extension is not available', async () => {
    jest.spyOn(explorer, 'getExtension').mockReturnValue(undefined);

    const importData: ImportConfigurationData = {
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

    const importData: ImportConfigurationData = {
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

    const importData: ImportConfigurationData = {
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

    const importData: ImportConfigurationData = {
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

    const importData: ImportConfigurationData = {
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
    const savedConfiguration: Partial<ConfigurationEntity> = {
      id: 1,
      name: 'Imported Config',
      description: 'Imported Description',
      status: ConfigurationStatus.ENABLED,
      agentName: 'Test Agent',
      chatFooter: 'Footer',
      chatSuggestions: [{ text: 'Hello', title: 'Hello', subtitle: 'Greeting' }] as any,
      executorEndpoint: undefined,
      executorHeaders: undefined,
      userGroupIds: ['group1'],
      extensions: [],
    };

    jest.spyOn(configRepository, 'save').mockResolvedValue(savedConfiguration);
    jest.spyOn(extensionRepository, 'save').mockResolvedValue([]);
    jest.spyOn(configRepository, 'findOne').mockResolvedValue({
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

    const importData: ImportConfigurationData = {
      name: 'Imported Config',
      description: 'Imported Description',
      enabled: true,
      agentName: 'Test Agent',
      chatFooter: 'Footer',
      chatSuggestions: [{ text: 'Hello', title: 'Hello', subtitle: 'Greeting' }] as any,
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
    expect(configRepository.save).toHaveBeenCalled();
    expect(extensionRepository.save).toHaveBeenCalled();
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

    jest.spyOn(configRepository, 'save').mockResolvedValue(savedConfiguration);
    jest.spyOn(extensionRepository, 'save').mockResolvedValue([]);
    jest.spyOn(configRepository, 'findOne').mockResolvedValue(savedConfiguration);
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

    const importData: ImportConfigurationData = {
      name: 'Disabled Config',
      description: 'Test',
      enabled: false,
      userGroupIds: [],
      extensions: [],
    };

    const result = await handler.execute(new ImportConfiguration(importData));

    expect(result.configuration.enabled).toBe(false);
    const savedEntity = configRepository.save.mock.calls[0][0];
    expect(savedEntity.status).toBe(ConfigurationStatus.DISABLED);
  });

  it('should unmask password values during import', async () => {
    const savedConfiguration: Partial<ConfigurationEntity> = {
      id: 3,
      name: 'Config with masked values',
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

    jest.spyOn(configRepository, 'save').mockResolvedValue(savedConfiguration);
    jest.spyOn(extensionRepository, 'save').mockImplementation((entities) => Promise.resolve(entities));
    jest.spyOn(configRepository, 'findOne').mockResolvedValue({
      ...savedConfiguration,
      extensions: [
        {
          id: 1,
          name: 'test-extension',
          enabled: true,
          values: { apiKey: 'real-key', endpoint: 'https://api.example.com' },
        } as Partial<ExtensionEntity>,
      ],
    });

    jest.spyOn(explorer, 'getExtension').mockImplementation((name) => {
      return {
        spec: {
          name,
          arguments: {
            apiKey: {
              type: 'string',
              format: 'password',
              required: false, // Make it optional so validation passes when masked value is removed
            } as ExtensionStringArgument,
            endpoint: {
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

    const importData: ImportConfigurationData = {
      name: 'Config with masked values',
      description: 'Test',
      enabled: true,
      userGroupIds: [],
      extensions: [
        {
          name: 'test-extension',
          enabled: true,
          values: {
            apiKey: '********************', // Masked value should be removed
            endpoint: 'https://api.example.com',
          },
        },
      ],
    };

    await handler.execute(new ImportConfiguration(importData));

    const savedExtensions = extensionRepository.save.mock.calls[0][0];
    expect(savedExtensions[0].values.apiKey).toBeUndefined(); // Masked value removed
    expect(savedExtensions[0].values.endpoint).toBe('https://api.example.com');
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

    jest.spyOn(configRepository, 'save').mockResolvedValue(savedConfiguration);
    jest.spyOn(extensionRepository, 'save').mockImplementation((entities) => Promise.resolve(entities));
    jest.spyOn(configRepository, 'findOne').mockResolvedValue({
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

    const importData: ImportConfigurationData = {
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

    const savedExtensions = extensionRepository.save.mock.calls[0][0];
    expect(savedExtensions[0].externalId).toBe('5-test-ext');
  });

  it('should handle configurable arguments correctly', async () => {
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

    jest.spyOn(configRepository, 'save').mockResolvedValue(savedConfiguration);
    jest.spyOn(extensionRepository, 'save').mockImplementation((entities) => Promise.resolve(entities));
    jest.spyOn(configRepository, 'findOne').mockResolvedValue({
      ...savedConfiguration,
      extensions: [
        {
          id: 1,
          name: 'test-extension',
          enabled: true,
          values: {},
          configurableArguments: { temperature: 0.7 } as any,
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

    const importData: ImportConfigurationData = {
      name: 'Config with args',
      description: 'Test',
      enabled: true,
      userGroupIds: [],
      extensions: [
        {
          name: 'test-extension',
          enabled: true,
          values: {},
          configurableArguments: { temperature: 0.7 } as any,
        },
      ],
    };

    await handler.execute(new ImportConfiguration(importData));

    const savedExtensions = extensionRepository.save.mock.calls[0][0];
    expect(savedExtensions[0].configurableArguments).toEqual({ temperature: 0.7 });
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

    jest.spyOn(configRepository, 'save').mockResolvedValue(savedConfiguration);
    jest.spyOn(extensionRepository, 'save').mockResolvedValue([]);
    jest.spyOn(configRepository, 'findOne').mockResolvedValue(savedConfiguration);
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

    const importData: ImportConfigurationData = {
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

    jest.spyOn(configRepository, 'save').mockResolvedValue(savedConfiguration);
    jest.spyOn(extensionRepository, 'save').mockResolvedValue([]);
    jest.spyOn(configRepository, 'findOne').mockResolvedValue(savedConfiguration);
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

    const importData: ImportConfigurationData = {
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

  it('should properly remove masked values without using unmaskExtensionValues', async () => {
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

    jest.spyOn(configRepository, 'save').mockResolvedValue(savedConfiguration);
    jest.spyOn(extensionRepository, 'save').mockImplementation((entities) => Promise.resolve(entities));
    jest.spyOn(configRepository, 'findOne').mockResolvedValue({
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

    const importData: ImportConfigurationData = {
      name: 'Config with masked nested values',
      description: 'Test',
      enabled: true,
      userGroupIds: [],
      extensions: [
        {
          name: 'test-extension',
          enabled: true,
          values: {
            apiKey: '********************', // Masked - should be removed
            endpoint: 'https://api.example.com', // Not masked - should remain
            nested: {
              secretKey: '********************', // Masked - should be removed
              publicValue: 'public', // Not masked - should remain
            },
          },
        },
      ],
    };

    await handler.execute(new ImportConfiguration(importData));

    const savedExtensions = extensionRepository.save.mock.calls[0][0];
    expect(savedExtensions[0].values.apiKey).toBeUndefined(); // Masked value removed
    expect(savedExtensions[0].values.endpoint).toBe('https://api.example.com'); // Kept
    expect(savedExtensions[0].values.nested.secretKey).toBeUndefined(); // Nested masked removed
    expect(savedExtensions[0].values.nested.publicValue).toBe('public'); // Nested kept
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

    jest.spyOn(configRepository, 'save').mockResolvedValue(savedConfiguration);
    jest.spyOn(extensionRepository, 'save').mockResolvedValue([]);
    jest.spyOn(configRepository, 'findOne').mockResolvedValue(savedConfiguration);
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

    const importData: ImportConfigurationData = {
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
});
