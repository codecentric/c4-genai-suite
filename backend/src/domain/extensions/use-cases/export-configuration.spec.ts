/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { NotFoundException } from '@nestjs/common';
import { ConfigurationEntity, ConfigurationStatus, ExtensionEntity } from '../../database';
import { Extension, ExtensionStringArgument } from '../interfaces';
import { ExplorerService } from '../services';
import { ExportConfiguration, ExportConfigurationHandler } from './export-configuration';

describe(ExportConfiguration.name, () => {
  let handler: ExportConfigurationHandler;
  let repository: any;
  let explorer: ExplorerService;

  beforeEach(() => {
    explorer = {
      getExtension: jest.fn(),
    } as unknown as ExplorerService;

    repository = {
      findOne: jest.fn(),
    };

    handler = new ExportConfigurationHandler(repository, explorer);
  });

  it('should throw NotFoundException when configuration does not exist', async () => {
    jest.spyOn(repository, 'findOne').mockResolvedValue(null);

    await expect(handler.execute(new ExportConfiguration(999))).rejects.toThrow(NotFoundException);
    await expect(handler.execute(new ExportConfiguration(999))).rejects.toThrow('Configuration with id 999 not found');
  });

  it('should export configuration with masked password values', async () => {
    const configurationEntity: Partial<ConfigurationEntity> = {
      id: 1,
      name: 'Test Config',
      description: 'Test Description',
      status: ConfigurationStatus.ENABLED,
      agentName: 'Test Agent',
      chatFooter: 'Footer',
      chatSuggestions: [{ text: 'Hello', title: 'Hello', subtitle: 'Greeting' }] as any,
      executorEndpoint: undefined,
      executorHeaders: undefined,
      userGroupIds: ['group1', 'group2'],
      extensions: [
        {
          id: 1,
          name: 'test-extension',
          enabled: true,
          values: {
            apiKey: 'secret-key-123',
            endpoint: 'https://api.example.com',
          },
          configurableArguments: undefined,
        } as Partial<ExtensionEntity>,
      ] as any,
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
    expect(new Date(result.exportedAt).getTime()).toBeLessThanOrEqual(new Date().getTime());
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

  it('should export configuration with multiple extensions', async () => {
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
      extensions: [
        {
          id: 1,
          name: 'extension-1',
          enabled: true,
          values: { key1: 'value1' },
          configurableArguments: undefined,
        } as Partial<ExtensionEntity>,
        {
          id: 2,
          name: 'extension-2',
          enabled: false,
          values: { key2: 'value2' },
          configurableArguments: { arg1: 'test' } as any,
        } as Partial<ExtensionEntity>,
      ] as any,
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
    expect(result.extensions[1].configurableArguments).toEqual({ arg1: 'test' });
  });
});
