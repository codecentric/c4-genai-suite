import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { addMilliseconds, addYears } from 'date-fns';
import { MoreThan } from 'typeorm';
import { z } from 'zod';
import { ChatContext, ChatMiddleware, ChatNextDelegate, FormActionType, GetContext, NamedStructuredTool } from 'src/domain/chat';
import { CacheEntity, CacheRepository } from 'src/domain/database';
import { Extension, ExtensionConfiguration, ExtensionEntity, ExtensionSpec } from 'src/domain/extensions';
import { User } from 'src/domain/users';
import { InternalError } from 'src/lib';
import { I18nService } from '../../localization/i18n.service';
import { Configuration, HTTPHeaders, ToolDto, ToolsApi } from './generated';

function isEnum<T>(values?: T[]): values is [T, ...T[]] {
  return !!values?.length;
}

@Extension()
export class OpenApiExtension implements Extension<OpenApiExtensionConfiguration> {
  private readonly logger = new Logger(OpenApiExtension.name);

  constructor(
    @InjectRepository(CacheEntity)
    private readonly cache: CacheRepository,
    private readonly i18n: I18nService,
  ) {}

  get spec(): ExtensionSpec {
    return {
      name: 'open-api',
      title: this.i18n.t('texts.extensions.openapi.title'),
      logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" xml:space="preserve"><linearGradient id="a" gradientUnits="userSpaceOnUse" x1="39.446" y1="801.241" x2="182.915" y2="944.694" gradientTransform="matrix(5.2695 0 0 -5.2695 -85.79 5100.133)"><stop offset=".05" stop-color="#07b0d3"/><stop offset=".229" stop-color="#4bb8cf"/><stop offset=".744" stop-color="#93ccb9"/><stop offset="1" stop-color="#a8d2af"/></linearGradient><path d="M533.1 834.4c-8.5-8.5-22.1-9.3-32.3-2.5-42.9 29.5-93.7 45.3-145.8 45.5-147.5 0-267.1-121.6-263.1-270.3 3.4-143.7 124.5-257.2 268.3-257.2h282.3c26.8 0 51 19.7 54.4 45.9 3.7 29.2-16.9 55.8-46.1 59.5-2.2.3-4.4.4-6.7.4H359.2c-77 0-142.9 60-145.8 136.8-2.9 80.8 62.1 148 142.5 148H639c193 0 355-152.6 358.4-345.7C1001 199.4 845.5 38 650.1 34.4c-1.7 0-3.4-.1-5.1-.1-60 0-136 14.4-204.5 65-12.3 8.2-13.6 27.2-2.9 37.8l29.3 29.3c8.5 8.5 22.1 9.3 32.3 2.5 42.9-29.5 93.7-45.3 145.8-45.5 147.5 0 267.1 121.6 263.1 269.9-3.4 143.7-124.5 257.2-268.3 257.2H357.6c-26.8 0-51-19.2-54.4-45.9-3.7-29.2 16.9-55.8 46.1-59.5 2.2-.3 4.4-.4 6.7-.4h284.8c77 0 142.9-60 145.8-136.8 2.9-80.8-62.1-148-142.5-148H360.9c-193-.3-354.5 152.4-358.4 345.4-3.6 195.4 151.9 356.8 347.3 360.4 1.7 0 3.4.1 5.1.1 60 0 136-14.4 204.5-65 12.3-8.2 13.6-27.2 2.9-37.8l-29.2-28.6z" fill="url(#a)"/></svg>',
      description: this.i18n.t('texts.extensions.openapi.description'),
      type: 'tool',
      arguments: {
        endpoint: {
          type: 'string',
          title: this.i18n.t('texts.extensions.common.endpoint'),
          description: this.i18n.t('texts.extensions.openapi.endpointHint'),
          required: true,
        },
        headers: {
          type: 'string',
          title: this.i18n.t('texts.extensions.common.headers'),
          description: this.i18n.t('texts.extensions.openapi.headersHint'),
          format: 'textarea',
        },
      },
    };
  }

  async test(configuration: OpenApiExtensionConfiguration) {
    const api = this.getApi(configuration);

    const tools = await api.getTools();

    if (tools.items.length === 0) {
      throw new InternalError('API does not expose any tools.');
    }
  }

  async getMiddlewares(_user: User, extension: ExtensionEntity<OpenApiExtensionConfiguration>): Promise<ChatMiddleware[]> {
    const middleware = {
      invoke: async (context: ChatContext, getContext: GetContext, next: ChatNextDelegate): Promise<any> => {
        try {
          const tools = await context.cache.get(this.spec.name, extension.values, async () => {
            const api = this.getApi(extension.values);

            const result: InternalTool[] = [];
            const tools = await api.getTools();

            for (const tool of tools.items) {
              result.push(new InternalTool(this.cache, context, tool, api, context.user, extension.externalId));
            }

            return result;
          });

          for (const tool of tools) {
            context.tools.push(tool);
          }
        } catch (err) {
          this.logger.error({ message: 'Failed to invoke tool server at {endpoint}', endpoint: extension.values.endpoint }, err);
        }

        return next(context);
      },
    };

    return Promise.resolve([middleware]);
  }

  private getApi(configuration: OpenApiExtensionConfiguration) {
    const headers: HTTPHeaders = {};

    if (configuration.headers) {
      for (const pair of configuration.headers.split(/[,;\n]/)) {
        const [key, value] = pair.trim().split('=');

        if (key && value) {
          headers[key.trim()] = value.trim();
        }
      }
    }

    const api = new ToolsApi(
      new Configuration({
        headers,
        basePath: configuration.endpoint,
      }),
    );

    return api;
  }
}

class InternalTool extends NamedStructuredTool {
  readonly name: string;
  readonly schema: z.ZodObject<any, any>;
  readonly displayName: string;
  readonly description: string;

  constructor(
    private readonly cache: CacheRepository,
    private readonly context: ChatContext,
    private readonly tool: ToolDto,
    private readonly api: ToolsApi,
    private readonly user: User,
    private readonly extensionExternalId: string,
  ) {
    super();

    const shape: Record<string, z.ZodType> = {};

    for (const [name, argument] of Object.entries(tool.arguments)) {
      let type: z.ZodType;
      if (argument.type === 'boolean') {
        type = z.boolean();
      } else if (argument.type === 'number') {
        type = z.number();
      } else if (isEnum(argument.allowedValues)) {
        type = z.enum(argument.allowedValues);
      } else {
        type = z.string();
      }

      if (argument.description) {
        type = type.describe(argument.description);
      }

      if (!argument.required) {
        type = type.optional().nullable();
      }

      shape[name] = type;
    }

    this.name = `${extensionExternalId}_${tool.name}`;
    this.schema = z.object(shape);
    this.description = tool.description;
    this.displayName = tool.name;
  }

  protected async _call(arg: z.infer<typeof this.schema>): Promise<string> {
    let confirmed: boolean | undefined = undefined;
    let input: string | undefined = undefined;

    const ui = this.tool.ui;
    if (ui?.type === 'confirm' && ui.label) {
      const formResult = await this.context.ui.form(ui.label, { type: 'object', title: this.displayName, properties: {} });
      confirmed = formResult.action === FormActionType.ACCEPT;
    } else if (ui?.type === 'input' && ui.label) {
      const now = new Date();
      // The cached value is specific for this extension and the user.
      const key = `${this.extensionExternalId}_${this.context.user.id}`;

      // Find a cached value which expiration date is in the future.
      const cached = await this.cache.findOneBy({ key, expires: MoreThan(now) });

      if (cached) {
        input = cached.value;
      } else {
        const formResult = await this.context.ui.form(ui.label, {
          type: 'object',
          title: this.displayName,
          properties: {
            text: { type: 'string', title: 'Text' },
          },
        });

        input = formResult.action === FormActionType.ACCEPT ? (formResult.data?.text as string) : undefined;

        let expires: Date;
        if (ui.cacheDuration > 0) {
          expires = addMilliseconds(now, ui.cacheDuration);
        } else {
          expires = addYears(now, 1000);
        }

        await this.cache.save({ key, value: input, expires });
      }
    }

    const { id, name, email } = this.context.user;
    const { result, debug } = await this.api.executeTool({
      confirmed,
      context: this.context.context,
      input,
      tool: this.name,
      user: {
        id,
        name,
        email,
      },

      values: arg,
    });

    if (debug) {
      this.context.result.next({ type: 'debug', content: debug });
    }

    return result;
  }
}

type OpenApiExtensionConfiguration = ExtensionConfiguration & {
  endpoint: string;
  headers: string;
};
