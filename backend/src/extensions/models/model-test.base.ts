import { generateText } from 'ai';
import { ChatContext, NamedStructuredTool } from 'src/domain/chat';
import { Extension, ExtensionConfiguration, ExtensionEntity } from 'src/domain/extensions';
import { User } from 'src/domain/users';
import { I18nService } from '../../localization/i18n.service';

type ExtensionConstructor = new (i18n: I18nService) => Extension;

export function modelExtensionTestSuite(modelExtension: ExtensionConstructor, modelExtensionConfig: ExtensionConfiguration) {
  let extension: Extension;

  const i18n = {
    t: (val: string) => val,
  } as unknown as I18nService;

  beforeEach(() => {
    extension = new modelExtension(i18n);
  });

  it('should have getMiddlewares method', async () => {
    const user: User = {
      id: '123',
      name: 'John Doe',
      email: 'johndoe@example.com',
      userGroupId: 'group123',
    };

    const context = {
      tools: [] as NamedStructuredTool[],
      llms: {},
      cache: {
        get: (_key: string, _args: any, resolver: () => Promise<any>) => {
          return resolver();
        },
      },
    } as ChatContext;
    const getContext = () => context;
    const next = (context: ChatContext) => Promise.resolve(context);

    const config: ExtensionConfiguration = modelExtensionConfig;
    const middlewares = await extension.getMiddlewares?.(user, { id: 2, externalId: '', values: config } as ExtensionEntity);

    expect(extension.getMiddlewares?.bind(extension)).toBeDefined();
    expect(middlewares?.length).toBe(1);

    if (middlewares?.length) {
      await middlewares[0].invoke(context, getContext, next);
    }

    expect(context.llms[extension.spec.name]).toBeDefined();
  });

  it('should have test method', async () => {
    const configuration: ExtensionConfiguration = modelExtensionConfig;
    await extension.test?.(configuration);
    expect(extension.test?.bind(extension)).toBeDefined();
    expect(generateText).toHaveBeenCalled();
  });
}
