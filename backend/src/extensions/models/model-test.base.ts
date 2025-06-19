import { ChatContext } from '@c4/library/domain/chat';
import { Extension, ExtensionConfiguration, ExtensionEntity } from '@c4/library/domain/extensions';
import { User } from '@c4/library/domain/users';
import { StructuredToolInterface } from '@langchain/core/tools';
import { I18nService } from '../../localization/i18n.service';

type ExtensionConstructor = new (i18n: I18nService) => Extension;

export function modelExtensionTestSuite(modelExtension: ExtensionConstructor, instance: { invoke: () => void }) {
  let invokeMock: jest.SpyInstance;
  let extension: Extension;

  const i18n = {
    t: (val: string) => val,
  } as unknown as I18nService;

  beforeEach(() => {
    extension = new modelExtension(i18n);
    invokeMock = jest.spyOn(instance, 'invoke').mockReturnThis();
  });

  it('should have getMiddlewares method', async () => {
    const user: User = {
      id: '123',
      name: 'John Doe',
      email: 'johndoe@example.com',
      userGroupId: 'group123',
    };

    const context = {
      tools: [] as StructuredToolInterface[],
      llms: {},
      cache: {
        get: (_key: string, _args: any, resolver: () => Promise<any>) => {
          return resolver();
        },
      },
    } as ChatContext;
    const getContext = () => context;
    const next = (context: ChatContext) => Promise.resolve(context);

    const config: ExtensionConfiguration = { modelName: '' };
    const middlewares = await extension.getMiddlewares?.(user, { id: 2, externalId: '', values: config } as ExtensionEntity);

    expect(extension.getMiddlewares?.bind(extension)).toBeDefined();
    expect(middlewares?.length).toBe(1);

    if (middlewares?.length) {
      await middlewares[0].invoke(context, getContext, next);
    }

    expect(context.llms[extension.spec.name]).toBeDefined();
  });

  it('should have test method', async () => {
    const configuration: ExtensionConfiguration = {};
    await extension.test?.(configuration);
    expect(extension.test?.bind(extension)).toBeDefined();
    expect(invokeMock).toHaveBeenCalled();
  });
}
