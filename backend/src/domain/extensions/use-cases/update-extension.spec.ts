import { HttpException, HttpStatus } from '@nestjs/common';
import { DeepPartial } from 'typeorm';
import { Extension, ExtensionStringArgument } from 'src/domain/extensions';
import { ExtensionEntity, ExtensionRepository } from '../../database';
import { ExplorerService } from '../services';
import { UpdateExtension, UpdateExtensionHandler } from './update-extension';

describe(UpdateExtension.name, () => {
  let handler: UpdateExtensionHandler;
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

    handler = new UpdateExtensionHandler(explorer, repository);
  });

  it('should throw not found when extension entity does not exist', async () => {
    jest.spyOn(explorer, 'getExtension').mockImplementation((name) => {
      return { spec: { name, arguments: {}, title: 'test', description: '', type: 'llm' } } as Extension;
    });
    jest.spyOn(repository, 'findOneBy').mockImplementation(() => {
      return Promise.resolve(null);
    });

    try {
      const result = await handler.execute(
        new UpdateExtension(1, {
          enabled: true,
          values: {},
        }),
      );
      expect(result).toBe(false);
    } catch (err) {
      expect((err as HttpException).getStatus()).toBe(HttpStatus.NOT_FOUND);
    }
  });

  it('should throw bad request when extension does not exist', async () => {
    jest.spyOn(explorer, 'getExtension').mockImplementation(() => undefined);
    jest.spyOn(repository, 'findOneBy').mockImplementation(async () => {
      return Promise.resolve({} as ExtensionEntity);
    });

    try {
      const result = await handler.execute(
        new UpdateExtension(1, {
          enabled: true,
          values: {},
        }),
      );
      expect(result).toBe(false);
    } catch (err) {
      expect((err as HttpException).getStatus()).toBe(HttpStatus.BAD_REQUEST);
    }
  });

  it('should update extension with valid values', async () => {
    jest.spyOn(repository, 'create').mockReturnValue({} as ExtensionEntity);
    jest.spyOn(repository, 'save').mockImplementation((v) => Promise.resolve(v as ExtensionEntity));
    jest.spyOn(explorer, 'getExtension').mockImplementation((name) => {
      return { spec: { name, arguments: {}, title: 'test', description: '', type: 'llm' } } as Extension;
    });
    jest.spyOn(repository, 'findOneBy').mockImplementation(async () => {
      return Promise.resolve({ name: 'test' } as ExtensionEntity);
    });

    const result = await handler.execute(
      new UpdateExtension(1, {
        enabled: true,
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
      return Promise.resolve(saveArg as ExtensionEntity);
    });

    const test = jest.fn().mockImplementation(() => {});
    jest.spyOn(repository, 'findOneBy').mockImplementation(async () => {
      return Promise.resolve({ values: { foo: 'existing' } as Record<string, any> } as ExtensionEntity);
    });

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
      new UpdateExtension(1, {
        enabled: true,
        values: {
          bar: 'secure',
        },
      }),
    );

    expect(saveArg).toEqual({
      enabled: true,
      state: {},
      values: {
        foo: 'existing',
        bar: 'secure',
      },
    });

    expect(result.extension.values).toEqual({
      foo: 'existing',
      bar: '********************',
    });
  });
});
