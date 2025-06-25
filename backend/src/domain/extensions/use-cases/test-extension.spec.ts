import { HttpException, HttpStatus } from '@nestjs/common';
import { Extension, ExtensionStringArgument } from 'src/domain/extensions';
import { ExtensionEntity, ExtensionRepository } from '../../database';
import { ExplorerService } from '../services';
import { TestExtension, TestExtensionHandler } from './test-extension';

describe(TestExtension.name, () => {
  let handler: TestExtensionHandler;
  let repository: ExtensionRepository;
  let explorer: ExplorerService;

  beforeEach(() => {
    explorer = {
      getExtension: jest.fn(),
    } as unknown as ExplorerService;
    repository = {
      findOneBy: jest.fn(),
    } as unknown as ExtensionRepository;

    handler = new TestExtensionHandler(explorer, repository);
  });

  it('should throw not found when extension does not exist', async () => {
    jest.spyOn(explorer, 'getExtension').mockImplementation(() => undefined);

    try {
      const result = await handler.execute(new TestExtension('unknown', {}));
      expect(result).toBe(false);
    } catch (err) {
      expect((err as HttpException).getStatus()).toBe(HttpStatus.NOT_FOUND);
    }
  });

  it('should throw bad request when extension test method does not exist', async () => {
    jest.spyOn(explorer, 'getExtension').mockImplementation((name) => {
      return { spec: { name, arguments: {}, title: 'test', description: '', type: 'llm' } } as Extension;
    });

    try {
      const result = await handler.execute(new TestExtension('unknown', {}));
      expect(result).toBe(false);
    } catch (err) {
      expect((err as HttpException).getStatus()).toBe(HttpStatus.BAD_REQUEST);
    }
  });

  it('should throw not found when extension entity does not exist', async () => {
    jest.spyOn(explorer, 'getExtension').mockImplementation((name) => {
      return {
        spec: { name, arguments: {}, title: 'test', description: '', type: 'llm' },
        test: async () => {},
        getMiddlewares: () => Promise.resolve([]),
      } as Extension;
    });

    jest.spyOn(repository, 'findOneBy').mockImplementation(() => Promise.resolve(null));

    try {
      const result = await handler.execute(new TestExtension('unknown', {}, 1));
      expect(result).toBe(false);
    } catch (err) {
      expect((err as HttpException).getStatus()).toBe(HttpStatus.NOT_FOUND);
    }
  });

  it('should succeed when extension, test method and extension entity exist', async () => {
    const test = jest.fn().mockImplementation(() => {});

    jest.spyOn(explorer, 'getExtension').mockImplementation((name) => {
      return {
        spec: { name, arguments: {}, title: 'test', description: '', type: 'llm' },
        test,
        getMiddlewares: () => Promise.resolve([]),
      } as Extension;
    });

    jest.spyOn(repository, 'findOneBy').mockImplementation(async () => {
      return Promise.resolve({} as ExtensionEntity);
    });

    const result = await handler.execute(new TestExtension('unknown', {}, 1));
    expect(result).toBe(true);
  });

  it('should succeed and remove masked values', async () => {
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

    jest.spyOn(repository, 'findOneBy').mockImplementation(async () => {
      return Promise.resolve({} as ExtensionEntity);
    });

    const result = await handler.execute(
      new TestExtension(
        'unknown',
        {
          foo: 'abc',
          bar: '********************',
        },
        1,
      ),
    );

    expect(test).toHaveBeenCalledWith({
      foo: 'abc',
    });
    expect(result).toBe(true);
  });
});
