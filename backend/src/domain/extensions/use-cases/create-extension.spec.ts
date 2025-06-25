import { HttpException, HttpStatus } from '@nestjs/common';
import { DeepPartial } from 'typeorm';
import { Extension, ExtensionStringArgument } from 'src/domain/extensions';
import { ExtensionEntity, ExtensionRepository } from '../../database';
import { ExplorerService } from '../services';
import { CreateExtension, CreateExtensionHandler } from './create-extension';

describe(CreateExtension.name, () => {
  let handler: CreateExtensionHandler;
  let repository: ExtensionRepository;
  let explorer: ExplorerService;

  beforeEach(() => {
    explorer = {
      getExtension: jest.fn(),
    } as unknown as ExplorerService;
    repository = {
      findOneBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as ExtensionRepository;

    handler = new CreateExtensionHandler(explorer, repository);
  });

  it('should throw bad request when extension does not exist', async () => {
    jest.spyOn(explorer, 'getExtension').mockImplementation(() => undefined);

    try {
      const result = await handler.execute(
        new CreateExtension(1, {
          enabled: true,
          name: 'test',
          values: {},
        }),
      );
      expect(result).toBe(false);
    } catch (err) {
      expect((err as HttpException).getStatus()).toBe(HttpStatus.BAD_REQUEST);
    }
  });

  it('should create extension with valid values', async () => {
    jest.spyOn(repository, 'create').mockReturnValue({} as ExtensionEntity);
    jest.spyOn(repository, 'save').mockImplementation((v) => Promise.resolve(v as ExtensionEntity));
    jest.spyOn(explorer, 'getExtension').mockImplementation((name) => {
      return { spec: { name, arguments: {}, title: 'test', description: '', type: 'llm' } } as Extension;
    });

    const result = await handler.execute(
      new CreateExtension(1, {
        enabled: true,
        name: 'test',
        values: {},
      }),
    );
    expect(result).toBeDefined();
    expect(result.extension.enabled).toBe(true);
    expect(result.extension.spec.name).toBe('test');
    expect(result.extension.values).toStrictEqual({});
  });

  it('should succeed and mask values', async () => {
    let saveArg: DeepPartial<ExtensionEntity> | undefined;

    jest.spyOn(repository, 'create').mockReturnValue({} as ExtensionEntity);
    jest.spyOn(repository, 'save').mockImplementation((v) => {
      saveArg = structuredClone(v);
      return Promise.resolve({ ...saveArg, id: 1 } as ExtensionEntity);
    });
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

    const result = await handler.execute(
      new CreateExtension(1, {
        enabled: true,
        name: 'test',
        values: {
          foo: 'test',
          bar: 'secure',
        },
      }),
    );

    expect(saveArg).toEqual({
      configurationId: 1,
      enabled: true,
      name: 'test',
      state: {},
      values: {
        foo: 'test',
        bar: 'secure',
      },
    });

    expect(result.extension.values).toEqual({
      foo: 'test',
      bar: '********************',
    });
  });
});
