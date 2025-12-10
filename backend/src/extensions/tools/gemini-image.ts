import { forwardRef, Inject, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import * as uuid from 'uuid';
import { z } from 'zod';
import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { AuthService } from 'src/domain/auth';
import { ChatContext, ChatMiddleware, ChatNextDelegate, GetContext, NamedStructuredTool } from 'src/domain/chat';
import { Extension, ExtensionConfiguration, ExtensionEntity, ExtensionSpec } from 'src/domain/extensions';
import { UploadBlob } from 'src/domain/settings';
import { User } from 'src/domain/users';
import { BlobCategory } from '../../domain/database';
import { I18nService } from '../../localization/i18n.service';

@Extension()
export class GeminiImageExtension implements Extension<GeminiImageExtensionConfiguration> {
  constructor(
    private readonly authService: AuthService,
    @Inject(forwardRef(() => CommandBus))
    private readonly commandBus: CommandBus,
    protected readonly i18n: I18nService,
  ) {}

  get spec(): ExtensionSpec {
    return {
      name: 'gemini-image',
      title: this.i18n.t('texts.extensions.gemini-image.title'),
      logo: '<svg fill="none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M16 8.016A8.522 8.522 0 008.016 16h-.032A8.521 8.521 0 000 8.016v-.032A8.521 8.521 0 007.984 0h.032A8.522 8.522 0 0016 7.984v.032z" fill="url(#prefix__paint0_radial_980_20147)"/><defs><radialGradient id="prefix__paint0_radial_980_20147" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(16.1326 5.4553 -43.70045 129.2322 1.588 6.503)"><stop offset=".067" stop-color="#9168C0"/><stop offset=".343" stop-color="#5684D1"/><stop offset=".672" stop-color="#1BA1E3"/></radialGradient></defs></svg>',
      description: this.i18n.t('texts.extensions.gemini-image.description'),
      type: 'tool',
      arguments: {
        apiKey: {
          type: 'string',
          title: this.i18n.t('texts.extensions.common.apiKey'),
          required: true,
          format: 'password',
        },
        modelName: {
          type: 'string',
          title: this.i18n.t('texts.extensions.common.modelName'),
          required: true,
          format: 'select',
          examples: ['gemini-2.5-flash-image', 'gemini-3-pro-image-preview'],
          showInList: true,
        },
      },
    };
  }

  async test({ apiKey, modelName }: GeminiImageExtensionConfiguration) {
    const client = createGoogleGenerativeAI({ apiKey });

    await generateText({
      model: client(modelName),
      prompt: 'Generate a simple test image',
    });
  }

  async getMiddlewares(_user: User, extension: ExtensionEntity<GeminiImageExtensionConfiguration>): Promise<ChatMiddleware[]> {
    const middleware = {
      invoke: async (context: ChatContext, getContext: GetContext, next: ChatNextDelegate): Promise<any> => {
        const tool = await context.cache.get(this.spec.name, extension.values, () => {
          return Promise.resolve(new InternalTool(this.authService, this.commandBus, this.spec, extension.values));
        });
        context.tools.push(tool);
        return next(context);
      },
    };

    return Promise.resolve([middleware]);
  }
}

class InternalTool extends NamedStructuredTool {
  readonly name: string;
  readonly description =
    'A tool to generate images from a prompt using Google Gemini Image (Nano Banana). It returns a link to an image. Show the image to the user by using Markdown to embed the image into your response, like `![alttext](link/from/the/response)`.';
  readonly displayName = this.name;
  readonly returnDirect = false;
  private readonly logger = new Logger(InternalTool.name);

  readonly schema = z.object({
    prompt: z.string(),
  });

  constructor(
    private readonly authService: AuthService,
    private readonly commandBus: CommandBus,
    spec: ExtensionSpec,
    private readonly configuration: GeminiImageExtensionConfiguration,
  ) {
    super();
    this.name = spec.name;
  }

  protected async _call({ prompt }: z.infer<typeof this.schema>): Promise<string> {
    try {
      const { apiKey, modelName } = this.configuration;

      const googleProvider = createGoogleGenerativeAI({
        apiKey,
      });

      const result = await generateText({
        model: googleProvider(modelName),
        prompt,
      });

      const file = result.files?.find((f) => f.mediaType?.startsWith('image/'));
      if (!file) {
        throw new Error('No image file received from Google');
      }

      const id = uuid.v4();
      const mimeType = file.mediaType || 'image/png';
      const imageBuffer = Buffer.from(file.uint8Array);
      const extension = mimeType.split('/')[1] || 'png';
      const fileName = `${id}.${extension}`;

      await this.commandBus.execute(
        new UploadBlob(id, imageBuffer, mimeType, fileName, imageBuffer.length, BlobCategory.LLM_IMAGE),
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

export type GeminiImageExtensionConfiguration = ExtensionConfiguration & {
  apiKey: string;
  modelName: string;
};
