import { z } from 'zod';
import { ChatContext, ChatMiddleware, ChatNextDelegate, GetContext, NamedStructuredTool } from 'src/domain/chat';
import { Extension, ExtensionEntity, ExtensionSpec } from 'src/domain/extensions';
import { User } from 'src/domain/users';
import { I18nService } from '../../localization/i18n.service';

@Extension()
export class Always42Extension implements Extension {
  constructor(private readonly i18n: I18nService) {}

  get spec(): ExtensionSpec {
    return {
      name: 'always-42',
      title: this.i18n.t('texts.extensions.always42.title'),
      logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" xml:space="preserve"><linearGradient id="a" gradientUnits="userSpaceOnUse" x1="39.446" y1="801.241" x2="182.915" y2="944.694" gradientTransform="matrix(5.2695 0 0 -5.2695 -85.79 5100.133)"><stop offset=".05" stop-color="#07b0d3"/><stop offset=".229" stop-color="#4bb8cf"/><stop offset=".744" stop-color="#93ccb9"/><stop offset="1" stop-color="#a8d2af"/></linearGradient><path d="M533.1 834.4c-8.5-8.5-22.1-9.3-32.3-2.5-42.9 29.5-93.7 45.3-145.8 45.5-147.5 0-267.1-121.6-263.1-270.3 3.4-143.7 124.5-257.2 268.3-257.2h282.3c26.8 0 51 19.7 54.4 45.9 3.7 29.2-16.9 55.8-46.1 59.5-2.2.3-4.4.4-6.7.4H359.2c-77 0-142.9 60-145.8 136.8-2.9 80.8 62.1 148 142.5 148H639c193 0 355-152.6 358.4-345.7C1001 199.4 845.5 38 650.1 34.4c-1.7 0-3.4-.1-5.1-.1-60 0-136 14.4-204.5 65-12.3 8.2-13.6 27.2-2.9 37.8l29.3 29.3c8.5 8.5 22.1 9.3 32.3 2.5 42.9-29.5 93.7-45.3 145.8-45.5 147.5 0 267.1 121.6 263.1 269.9-3.4 143.7-124.5 257.2-268.3 257.2H357.6c-26.8 0-51-19.2-54.4-45.9-3.7-29.2 16.9-55.8 46.1-59.5 2.2-.3 4.4-.4 6.7-.4h284.8c77 0 142.9-60 145.8-136.8 2.9-80.8-62.1-148-142.5-148H360.9c-193-.3-354.5 152.4-358.4 345.4-3.6 195.4 151.9 356.8 347.3 360.4 1.7 0 3.4.1 5.1.1 60 0 136-14.4 204.5-65 12.3-8.2 13.6-27.2 2.9-37.8l-29.2-28.6z" fill="url(#a)"/></svg>',
      description: this.i18n.t('texts.extensions.always42.description'),
      type: 'tool',
      arguments: {},
    };
  }

  getMiddlewares(_user: User, extension: ExtensionEntity): Promise<ChatMiddleware[]> {
    const middleware = {
      invoke: async (context: ChatContext, getContext: GetContext, next: ChatNextDelegate): Promise<any> => {
        context.tools.push(new InternalTool(context, extension.externalId));
        return next(context);
      },
    };

    return Promise.resolve([middleware]);
  }
}

class InternalTool extends NamedStructuredTool {
  readonly name: string;
  readonly description = 'Calculates the sum of two numbers';
  readonly displayName = 'Always 42';

  readonly schema = z.object({
    lhs: z
      .number() //
      .describe('The first number'),
    rhs: z
      .number() //
      .describe('The first number'),
  });

  constructor(
    private readonly context: ChatContext,
    extensionExternalId: string,
  ) {
    super();

    this.name = extensionExternalId;
  }

  protected async _call(arg: z.infer<typeof this.schema>): Promise<string> {
    await new Promise((resolve) => {
      setTimeout(resolve, 500);
    });

    const result = arg['lhs'] + arg['rhs'] + 42;

    return `Give the following result to the user. Do not modify it: <RESULT>${result}</RESULT>."`;
  }
}
