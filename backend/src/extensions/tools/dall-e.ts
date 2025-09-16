import { DallEAPIWrapper } from '@langchain/openai';
import { forwardRef, Inject, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import * as uuid from 'uuid';
import * as z from 'zod';
import { AuthService } from 'src/domain/auth';
import { ChatContext, ChatMiddleware, ChatNextDelegate, GetContext, NamedStructuredTool } from 'src/domain/chat';
import { Extension, ExtensionConfiguration, ExtensionEntity, ExtensionSpec } from 'src/domain/extensions';
import { UploadBlob } from 'src/domain/settings';
import { User } from 'src/domain/users';
import { BlobCategory } from '../../domain/database';
import { I18nService } from '../../localization/i18n.service';

@Extension()
export class DallEExtension implements Extension<DallEExtensionConfiguration> {
  constructor(
    private readonly authService: AuthService,
    @Inject(forwardRef(() => CommandBus))
    private readonly commandBus: CommandBus,
    protected readonly i18n: I18nService,
  ) {}

  get spec(): ExtensionSpec {
    return {
      name: 'dall-e',
      title: this.i18n.t('texts.extensions.dalle.title'),
      logo: '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 2406 2406"><path d="M1 578.4C1 259.5 259.5 1 578.4 1h1249.1c319 0 577.5 258.5 577.5 577.4V2406H578.4C259.5 2406 1 2147.5 1 1828.6V578.4z" fill="#74aa9c"/><path id="a" d="M1107.3 299.1c-197.999 0-373.9 127.3-435.2 315.3L650 743.5v427.9c0 21.4 11 40.4 29.4 51.4l344.5 198.515V833.3h.1v-27.9L1372.7 604c33.715-19.52 70.44-32.857 108.47-39.828L1447.6 450.3c-86.6-96.8-210.5-151.8-340.3-151.2zm0 117.5-.6.6c79.699 0 156.3 27.5 217.6 78.4-2.5 1.2-7.4 4.3-11 6.1L952.8 709.3c-18.4 10.4-29.4 30-29.4 51.4V1248l-155.1-89.4V755.8c-.1-187.099 151.601-338.9 339-339.2z" fill="#fff"/><use xlink:href="#a" transform="rotate(60 1203 1203)"/><use xlink:href="#a" transform="rotate(120 1203 1203)"/><use xlink:href="#a" transform="rotate(180 1203 1203)"/><use xlink:href="#a" transform="rotate(240 1203 1203)"/><use xlink:href="#a" transform="rotate(300 1203 1203)"/></svg>',
      description: this.i18n.t('texts.extensions.dalle.description'),
      type: 'tool',
      arguments: {
        apiKey: {
          type: 'string',
          title: this.i18n.t('texts.extensions.common.apiKey'),
          required: true,
          format: 'password',
          description: this.i18n.t('texts.extensions.dalle.apiKeyHint'),
        },
        modelName: {
          type: 'string',
          title: this.i18n.t('texts.extensions.common.modelName'),
          required: true,
          format: 'select',
          enum: ['dall-e-2', 'dall-e-3'],
          showInList: true,
        },
        style: {
          type: 'string',
          title: this.i18n.t('texts.extensions.common.style'),
          description: this.i18n.t('texts.extensions.dalle.styleHint'),
          format: 'select',
          enum: ['natural', 'vivid'],
          showInList: true,
        },
        quality: {
          type: 'string',
          title: this.i18n.t('texts.extensions.common.quality'),
          description: this.i18n.t('texts.extensions.dalle.qualityHint'),
          format: 'select',
          enum: ['standard', 'hd'],
        },
        size: {
          type: 'string',
          title: this.i18n.t('texts.extensions.common.size'),
          description: this.i18n.t('texts.extensions.dalle.sizeHint'),
          format: 'select',
          enum: ['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792'],
        },
      },
    };
  }

  async test(configuration: DallEExtensionConfiguration) {
    const wrapper = this.createWrapper(configuration);

    await wrapper.invoke('Dog');
  }

  async getMiddlewares(_user: User, extension: ExtensionEntity<DallEExtensionConfiguration>): Promise<ChatMiddleware[]> {
    const middleware = {
      invoke: async (context: ChatContext, getContext: GetContext, next: ChatNextDelegate): Promise<any> => {
        const tool = await context.cache.get(this.spec.name, extension.values, () => {
          const wrapper = this.createWrapper(extension.values);

          return Promise.resolve(new InternalTool(this.authService, wrapper, this.commandBus, this.spec));
        });

        context.tools.push(tool);

        return next(context);
      },
    };

    return Promise.resolve([middleware]);
  }

  protected createWrapper(configuration: DallEExtensionConfiguration) {
    const { apiKey, modelName, quality, size, style } = configuration;

    return new DallEAPIWrapper({
      modelName,
      quality,
      style,
      size,
      openAIApiKey: apiKey,
    });
  }
}

class InternalTool extends NamedStructuredTool {
  readonly name: string;
  readonly description =
    'A tool to generate images from a prompt. It returns a link to an image. Show the image to the user by using Markdown to embed the image into your response, like `![alttext](link/from/the/response)`.';
  readonly displayName: string;
  readonly returnDirect = false;
  private readonly logger = new Logger(InternalTool.name);

  get lc_id() {
    return [...this.lc_namespace, this.name];
  }

  readonly schema = z.object({
    input: z.string(),
  });

  constructor(
    private readonly authService: AuthService,
    private readonly wrapper: DallEAPIWrapper,
    private readonly commandBus: CommandBus,
    spec: ExtensionSpec,
  ) {
    super();
    this.name = spec.name;
    this.displayName = spec.title;
  }

  protected async _call({ input }: z.infer<typeof this.schema>): Promise<string> {
    try {
      const image = (await this.wrapper.invoke(input)) as string;

      // Download the image to put it in our store.
      const downloaded = await fetch(image);
      if (!downloaded.ok) {
        return 'Failed to download image';
      }

      // Would be great to have a solution that streams the buffer to the database.
      const buffer = await downloaded.arrayBuffer();

      const id = uuid.v4();

      await this.commandBus.execute(
        new UploadBlob(
          id,
          Buffer.from(buffer),
          downloaded.headers.get('Content-Type') || 'unknown',
          downloaded.headers.get('filename') || 'unknown',
          buffer.byteLength,
          BlobCategory.LLM_IMAGE,
        ),
      );

      return `${this.authService.config.baseUrl}/blobs/${id}`;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error occurred in extension ${this.name}: ${error.message}`, error.stack);
      } else {
        this.logger.error(`Unknown error occurred in extension ${this.name}: ${JSON.stringify(error)}`);
      }
      return 'Failed';
    }
  }
}

export type DallEExtensionConfiguration = ExtensionConfiguration & {
  apiKey: string;
  modelName: string;
  style: 'natural' | 'vivid';
  quality: 'standard' | 'hd';
  size: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792';
};
