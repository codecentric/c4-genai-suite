import { Tool } from '@langchain/core/tools';
import { forwardRef, Inject, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import OpenAI from 'openai';
import * as uuid from 'uuid';
import { AuthService } from 'src/domain/auth';
import { ChatContext, ChatMiddleware, ChatNextDelegate, GetContext } from 'src/domain/chat';
import { Extension, ExtensionConfiguration, ExtensionEntity, ExtensionSpec } from 'src/domain/extensions';
import { UploadBlob } from 'src/domain/settings';
import { User } from 'src/domain/users';
import { BlobCategory } from '../../domain/database';
import { I18nService } from '../../localization/i18n.service';

@Extension()
export class GPTImage1Extension implements Extension<GPTImage1ExtensionConfiguration> {
  constructor(
    private readonly authService: AuthService,
    @Inject(forwardRef(() => CommandBus))
    private readonly commandBus: CommandBus,
    protected readonly i18n: I18nService,
  ) {}

  get spec(): ExtensionSpec {
    return {
      name: 'gpt-image-1',
      title: this.i18n.t('texts.extensions.gpt-image-1.title'),
      logo: '<svg fill="#000000" width="800px" height="800px" viewBox="0 0 24 24" role="img" xmlns="http://www.w3.org/2000/svg"><title>OpenAI icon</title><path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/></svg>',
      description: this.i18n.t('texts.extensions.gpt-image-1.description'),
      type: 'tool',
      arguments: {
        apiKey: {
          type: 'string',
          title: this.i18n.t('texts.extensions.common.apiKey'),
          required: true,
          format: 'password',
        },
        quality: {
          type: 'string',
          title: this.i18n.t('texts.extensions.gpt-image-1.quality'),
          required: false,
          format: 'select',
          enum: ['auto', 'high', 'medium', 'low'],
        },
        size: {
          type: 'string',
          title: this.i18n.t('texts.extensions.gpt-image-1.size'),
          required: false,
          format: 'select',
          enum: ['auto', '1024x1024', '1536x1024', '1024x1536'],
        },
      },
    };
  }

  async test(configuration: GPTImage1ExtensionConfiguration) {
    const client = this.createGptImageClient(configuration);

    await client.images.generate({
      model: 'gpt-image-1',
      prompt: 'test',
    });
  }

  async getMiddlewares(user: User, extension: ExtensionEntity<GPTImage1ExtensionConfiguration>): Promise<ChatMiddleware[]> {
    const middleware = {
      invoke: async (context: ChatContext, getContext: GetContext, next: ChatNextDelegate): Promise<any> => {
        const tool = await context.cache.get(this.spec.name, extension.values, () => {
          const client = this.createGptImageClient(extension.values);
          return Promise.resolve(new InternalTool(this.authService, client, this.commandBus, this.spec, extension.values));
        });
        context.tools.push(tool);

        return next(context);
      },
    };

    return Promise.resolve([middleware]);
  }

  protected createGptImageClient(configuration: GPTImage1ExtensionConfiguration) {
    return new OpenAI({
      apiKey: configuration.apiKey,
    });
  }
}

class InternalTool extends Tool {
  readonly name: string;
  readonly description =
    'A tool to generate images from a prompt using GPT-Image-1. It returns a link to an image. Show the image to the user by using Markdown to embed the image into your response, like `![alttext](link/from/the/response)`.';
  readonly returnDirect = false;
  private readonly logger = new Logger(InternalTool.name);

  get lc_id() {
    return [...this.lc_namespace, this.name];
  }

  constructor(
    private readonly authService: AuthService,
    private readonly client: OpenAI,
    private readonly commandBus: CommandBus,
    spec: ExtensionSpec,
    private readonly configuration: GPTImage1ExtensionConfiguration,
  ) {
    super();
    this.name = spec.name;
  }

  protected async _call(prompt: string): Promise<string> {
    try {
      const response = await this.client.images.generate({
        model: 'gpt-image-1',
        prompt: prompt,
        size: this.configuration.size,
      });

      const imageData = response?.data?.[0];

      if (!imageData) {
        throw new Error('No image data received from OpenAI');
      }

      const id = uuid.v4();
      const contentType = response.output_format || 'png';
      let imageBuffer: Buffer;
      let fileName;

      if (imageData.b64_json) {
        imageBuffer = Buffer.from(imageData.b64_json, 'base64');
        fileName = `${id}.${contentType}`;
      } else {
        throw new Error('No valid image data format received from OpenAI');
      }

      await this.commandBus.execute(
        new UploadBlob(id, imageBuffer, contentType, fileName, imageBuffer.length, BlobCategory.LLM_IMAGE),
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

export type GPTImage1ExtensionConfiguration = ExtensionConfiguration & {
  apiKey: string;
  quality: 'auto' | 'high' | 'medium' | 'low';
  size: 'auto' | '1024x1024' | '1536x1024' | '1024x1536';
};
