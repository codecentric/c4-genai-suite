import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ConfigurationEntity, ConfigurationStatus, ExtensionEntity } from '../../database';
import { ChatSuggestion } from '../../shared';
import { Extension, ExtensionObjectArgument, ExtensionStringArgument } from '../interfaces';
import { ExplorerService } from '../services';
import { ExportConfiguration, ExportConfigurationHandler } from './export-configuration';

interface MockConfigurationRepository {
  findOne: jest.Mock;
}

describe(ExportConfiguration.name, () => {
  let handler: ExportConfigurationHandler;
  let repository: MockConfigurationRepository;
  let explorer: ExplorerService;

  beforeEach(() => {
    explorer = {
      getExtension: jest.fn(),
    } as unknown as ExplorerService;

    repository = {
      findOne: jest.fn(),
    };

    handler = new ExportConfigurationHandler(repository as unknown as Repository<ConfigurationEntity>, explorer);
  });

  it('should throw NotFoundException when configuration does not exist', async () => {
    jest.spyOn(repository, 'findOne').mockResolvedValue(null);

    await expect(handler.execute(new ExportConfiguration(999))).rejects.toThrow(NotFoundException);
    await expect(handler.execute(new ExportConfiguration(999))).rejects.toThrow('Configuration with id 999 not found');
  });

  it('should export configuration with masked password values', async () => {
    const chatSuggestions: ChatSuggestion[] = [{ text: 'Hello', title: 'Hello', subtitle: 'Greeting' }];
    const extensions = [
      {
        id: 1,
        name: 'test-extension',
        enabled: true,
        values: {
          apiKey: 'secret-key-123',
          endpoint: 'https://api.example.com',
        },
        configurableArguments: undefined,
      },
    ] as unknown as ExtensionEntity[];

    const configurationEntity: Partial<ConfigurationEntity> = {
      id: 1,
      name: 'Test Config',
      description: 'Test Description',
      status: ConfigurationStatus.ENABLED,
      agentName: 'Test Agent',
      chatFooter: 'Footer',
      chatSuggestions,
      executorEndpoint: undefined,
      executorHeaders: undefined,
      userGroupIds: ['group1', 'group2'],
      extensions,
    };

    jest.spyOn(repository, 'findOne').mockResolvedValue(configurationEntity);
    jest.spyOn(explorer, 'getExtension').mockImplementation((name) => {
      return {
        spec: {
          name,
          arguments: {
            apiKey: {
              type: 'string',
              format: 'password',
              required: true,
            } as ExtensionStringArgument,
            endpoint: {
              type: 'string',
              required: true,
            } as ExtensionStringArgument,
          },
          title: 'Test Extension',
          description: 'Test',
          type: 'llm',
        },
        getMiddlewares: () => Promise.resolve([]),
      } as Extension;
    });

    // Set VERSION for test
    process.env.VERSION = '1.0.0';

    const result = await handler.execute(new ExportConfiguration(1));

    expect(result).toBeDefined();
    expect(result.version).toBe('1.0.0');
    expect(result.exportedAt).toBeDefined();
    expect(result.exportedAt && new Date(result.exportedAt).getTime()).toBeLessThanOrEqual(new Date().getTime());
    expect(result.originId).toBe(1);
    expect(result.name).toBe('Test Config');
    expect(result.description).toBe('Test Description');
    expect(result.enabled).toBe(false);
    expect(result.agentName).toBe('Test Agent');
    expect(result.chatFooter).toBe('Footer');
    expect(result.chatSuggestions).toEqual([{ text: 'Hello', title: 'Hello', subtitle: 'Greeting' }]);
    expect(result.userGroupIds).toEqual(['group1', 'group2']);
    expect(result.extensions).toHaveLength(1);
    expect(result.extensions[0].name).toBe('test-extension');
    expect(result.extensions[0].enabled).toBe(true);
    expect(result.extensions[0].values.apiKey).toBe('********************');
    expect(result.extensions[0].values.endpoint).toBe('https://api.example.com');

    // Clean up
    delete process.env.VERSION;
  });

  it('should export configuration without extensions', async () => {
    const configurationEntity: Partial<ConfigurationEntity> = {
      id: 2,
      name: 'Empty Config',
      description: 'No extensions',
      status: ConfigurationStatus.DISABLED,
      agentName: undefined,
      chatFooter: undefined,
      chatSuggestions: undefined,
      executorEndpoint: undefined,
      executorHeaders: undefined,
      userGroupIds: [],
      extensions: [],
    };

    jest.spyOn(repository, 'findOne').mockResolvedValue(configurationEntity);

    const result = await handler.execute(new ExportConfiguration(2));

    expect(result).toBeDefined();
    expect(result.originId).toBe(2);
    expect(result.name).toBe('Empty Config');
    expect(result.enabled).toBe(false);
    expect(result.extensions).toHaveLength(0);
  });

  it('should export configuration with masked nested password values', async () => {
    const extensions = [
      {
        id: 1,
        name: 'test-extension',
        enabled: true,
        values: {
          apiKey: 'secret-key-123',
          endpoint: 'https://api.example.com',
          nested: {
            secretKey: 'nested-secret-456',
            publicValue: 'public',
          },
        },
        configurableArguments: undefined,
      },
    ] as unknown as ExtensionEntity[];

    const configurationEntity: Partial<ConfigurationEntity> = {
      id: 4,
      name: 'Nested Password Config',
      description: 'Config with nested password fields',
      status: ConfigurationStatus.ENABLED,
      agentName: undefined,
      chatFooter: undefined,
      chatSuggestions: undefined,
      executorEndpoint: undefined,
      executorHeaders: undefined,
      userGroupIds: [],
      extensions,
    };

    jest.spyOn(repository, 'findOne').mockResolvedValue(configurationEntity);
    jest.spyOn(explorer, 'getExtension').mockImplementation((name) => {
      return {
        spec: {
          name,
          arguments: {
            apiKey: {
              type: 'string',
              format: 'password',
              required: true,
            } as ExtensionStringArgument,
            endpoint: {
              type: 'string',
              required: true,
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
            } as ExtensionObjectArgument,
          },
          title: 'Test Extension',
          description: 'Test',
          type: 'tool',
        },
        getMiddlewares: () => Promise.resolve([]),
      } as Extension;
    });

    const result = await handler.execute(new ExportConfiguration(4));

    expect(result).toBeDefined();
    expect(result.originId).toBe(4);
    expect(result.extensions).toHaveLength(1);

    const ext = result.extensions[0];
    // Top-level password field should be masked
    expect(ext.values.apiKey).toBe('********************');
    // Top-level non-password field should not be masked
    expect(ext.values.endpoint).toBe('https://api.example.com');
    // Nested password field should be masked
    const nestedValues = ext.values.nested as Record<string, unknown>;
    expect(nestedValues.secretKey).toBe('********************');
    // Nested non-password field should not be masked
    expect(nestedValues.publicValue).toBe('public');
  });

  it('should export configuration with multiple extensions', async () => {
    const configurableArguments: ExtensionObjectArgument = {
      type: 'object',
      title: 'Configuration',
      properties: {
        arg1: { type: 'string', title: 'Arg 1', required: false },
      },
      required: false,
    };

    const extensions = [
      {
        id: 1,
        name: 'extension-1',
        enabled: true,
        values: { key1: 'value1' },
        configurableArguments: undefined,
      },
      {
        id: 2,
        name: 'extension-2',
        enabled: false,
        values: { key2: 'value2' },
        configurableArguments,
      },
    ] as unknown as ExtensionEntity[];

    const configurationEntity: Partial<ConfigurationEntity> = {
      id: 3,
      name: 'Multi Extension Config',
      description: 'Multiple extensions',
      status: ConfigurationStatus.ENABLED,
      agentName: undefined,
      chatFooter: undefined,
      chatSuggestions: undefined,
      executorEndpoint: undefined,
      executorHeaders: undefined,
      userGroupIds: ['admin'],
      extensions,
    };

    jest.spyOn(repository, 'findOne').mockResolvedValue(configurationEntity);
    jest.spyOn(explorer, 'getExtension').mockImplementation((name) => {
      return {
        spec: {
          name,
          arguments: {},
          title: name,
          description: 'Test',
          type: 'tool',
        },
        getMiddlewares: () => Promise.resolve([]),
      } as Extension;
    });

    const result = await handler.execute(new ExportConfiguration(3));

    expect(result.originId).toBe(3);
    expect(result.extensions).toHaveLength(2);
    expect(result.extensions[0].name).toBe('extension-1');
    expect(result.extensions[0].enabled).toBe(true);
    expect(result.extensions[1].name).toBe('extension-2');
    expect(result.extensions[1].enabled).toBe(false);
    expect(result.extensions[1].configurableArguments).toEqual(configurableArguments);
  });
});
