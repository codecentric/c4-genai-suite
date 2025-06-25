import { Extension, ExtensionStringArgument } from 'src/domain/extensions';
import { ExtensionEntity, ExtensionRepository } from '../../database';
import { ExplorerService } from '../services';
import { GetExtensions, GetExtensionsHandler } from './get-extensions';

describe(GetExtensionsHandler.name, () => {
  let handler: GetExtensionsHandler;
  let repository: ExtensionRepository;
  let explorer: ExplorerService;

  beforeEach(() => {
    explorer = {
      getExtension: jest.fn(),
    } as unknown as ExplorerService;
    repository = {
      find: jest.fn(),
    } as unknown as ExtensionRepository;

    handler = new GetExtensionsHandler(explorer, repository);
  });

  it('should return enabled extensions by default', async () => {
    const test = jest.fn().mockImplementation(() => {});

    jest.spyOn(explorer, 'getExtension').mockImplementation((name) => {
      return {
        spec: { logo: '', name, arguments: {}, title: 'test', description: '', type: 'llm' },
        test,
      } as unknown as Extension;
    });

    jest.spyOn(repository, 'find').mockImplementation(async () => {
      return Promise.resolve([
        { name: 'test', enabled: true, values: {} },
        { name: 'test', enabled: false, values: {} },
      ] as ExtensionEntity[]);
    });

    const result = await handler.execute(new GetExtensions(1));
    expect(result.extensions.length).toBe(1);
  });

  it('should return disabled extensions when selected', async () => {
    const test = jest.fn().mockImplementation(() => {});

    jest.spyOn(explorer, 'getExtension').mockImplementation((name) => {
      return {
        spec: { name, arguments: {}, title: 'test', description: '', type: 'llm' },
        test,
        getMiddlewares: () => Promise.resolve([]),
      } as Extension;
    });

    jest.spyOn(repository, 'find').mockImplementation(async () => {
      return Promise.resolve([
        { name: 'test', enabled: true, values: {} },
        { name: 'test', enabled: false, values: {} },
      ] as ExtensionEntity[]);
    });

    const result = await handler.execute(new GetExtensions(1, true));
    expect(result.extensions.length).toBe(2);
  });

  it('should mask keys by default', async () => {
    const test = jest.fn().mockImplementation(() => {});

    jest.spyOn(explorer, 'getExtension').mockImplementation((name) => {
      return {
        spec: {
          name,
          arguments: {
            foo: {
              type: 'string',
              required: true,
            } as ExtensionStringArgument,
            bar: {
              type: 'string',
              format: 'password',
              required: true,
            } as ExtensionStringArgument,
          },
          title: 'test',
          description: '',
          type: 'llm',
        },
        test,
        getMiddlewares: () => Promise.resolve([]),
      } as Extension;
    });

    jest.spyOn(repository, 'find').mockImplementation(() => {
      return Promise.resolve([{ name: 'test', values: { foo: 'abc', bar: 'secure' } as Record<string, any> } as ExtensionEntity]);
    });

    const result = await handler.execute(new GetExtensions(1, true));
    expect(result.extensions[0].values).toStrictEqual({
      foo: 'abc',
      bar: '********************',
    });
  });

  it('should not mask keys when masking is disabled', async () => {
    const test = jest.fn().mockImplementation(() => {});
    jest.spyOn(explorer, 'getExtension').mockImplementation((name) => {
      return {
        spec: {
          name,
          arguments: {
            foo: {
              type: 'string',
              required: true,
            } as ExtensionStringArgument,
            bar: {
              type: 'string',
              format: 'password',
              required: true,
            } as ExtensionStringArgument,
          },
          title: 'test',
          description: '',
          type: 'llm',
        },
        test,
        getMiddlewares: () => Promise.resolve([]),
      } as Extension;
    });

    jest.spyOn(repository, 'find').mockImplementation(() => {
      return Promise.resolve([{ name: 'test', values: { foo: 'abc', bar: 'secure' } as Record<string, any> } as ExtensionEntity]);
    });

    const result = await handler.execute(new GetExtensions(1, true, false));
    expect(result.extensions[0].values).toStrictEqual({
      foo: 'abc',
      bar: 'secure',
    });
  });
});
