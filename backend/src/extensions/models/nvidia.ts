import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { CallSettings, generateText } from 'ai';
import { ChatContext, ChatMiddleware, ChatNextDelegate, GetContext } from 'src/domain/chat';
import { Extension, ExtensionConfiguration, ExtensionEntity, ExtensionSpec } from 'src/domain/extensions';
import { User } from 'src/domain/users';
import { I18nService } from '../../localization/i18n.service';

@Extension()
export class NvidiaModelExtension implements Extension<NvidiaModelExtensionConfiguration> {
  constructor(private readonly i18n: I18nService) {}

  get spec(): ExtensionSpec {
    return {
      name: 'nvidia',
      title: this.i18n.t('texts.extensions.nvidia.title'),
      logo: '<svg height="1950" viewBox="0 .278 199.985 154.827" width="2500" xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd"><path d="m83.166 117.671.004 37.434h10.57v-37.433h-10.574zm-83.166-.05v37.484h10.666v-28.463l8.263.003c2.737 0 4.686.681 6.005 2.088 1.673 1.782 2.355 4.655 2.355 9.912v16.46h10.334v-20.71c0-14.781-9.422-16.775-18.64-16.775h-18.983zm100.188.051v37.433h17.148c9.136 0 12.117-1.52 15.342-4.926 2.28-2.392 3.753-7.642 3.753-13.379 0-5.261-1.247-9.956-3.422-12.879-3.917-5.227-9.56-6.249-17.983-6.249zm10.487 8.15h4.546c6.594 0 10.86 2.962 10.86 10.646 0 7.686-4.266 10.647-10.86 10.647h-4.546v-21.292zm-42.752-8.15-8.823 29.668-8.455-29.666-11.412-.002 12.074 37.433h15.238l12.169-37.433h-10.79zm73.427 37.433h10.574v-37.43l-10.576-.003zm29.637-37.42-14.763 37.407h10.425l2.336-6.612h17.47l2.21 6.612h11.32l-14.876-37.41-14.122.004zm6.863 6.825 6.404 17.524h-13.01z" fill="#1a1919"/><path d="m69.189 29.986v-8.993a67.728 67.728 0 0 1 2.653-.136c24.596-.773 40.733 21.134 40.733 21.134s-17.428 24.206-36.115 24.206c-2.692 0-5.1-.433-7.271-1.162v-27.27c9.575 1.156 11.5 5.386 17.258 14.982l12.803-10.795s-9.345-12.258-25.1-12.258c-1.715 0-3.353.12-4.961.292zm0-29.707v13.433c.882-.07 1.766-.126 2.653-.158 34.205-1.152 56.489 28.052 56.489 28.052s-25.597 31.124-52.262 31.124c-2.443 0-4.73-.225-6.88-.606v8.303c1.838.234 3.742.372 5.73.372 24.815 0 42.76-12.672 60.138-27.671 2.879 2.307 14.675 7.919 17.1 10.378-16.523 13.832-55.028 24.98-76.857 24.98a63.43 63.43 0 0 1 -6.111-.318v11.67h94.316v-99.56h-94.315zm0 64.756v7.09c-22.952-4.093-29.322-27.95-29.322-27.95s11.02-12.21 29.322-14.189v7.779c-.014 0-.024-.004-.036-.004-9.604-1.154-17.108 7.82-17.108 7.82s4.204 15.106 17.144 19.454zm-40.764-21.895s13.602-20.073 40.764-22.148v-7.28c-30.084 2.414-56.136 27.893-56.136 27.893s14.754 42.658 56.137 46.563v-7.74c-30.368-3.822-40.765-37.288-40.765-37.288z" fill="#76b900"/></g></svg>',
      description: this.i18n.t('texts.extensions.nvidia.description'),
      type: 'llm',
      arguments: {
        apiKey: {
          type: 'string',
          title: this.i18n.t('texts.extensions.common.apiKey'),
          required: true,
          format: 'password',
        },
        baseUrl: {
          type: 'string',
          title: this.i18n.t('texts.extensions.common.endpoint'),
          required: true,
          description: this.i18n.t('texts.extensions.openai.endpointHint'),
        },
        modelName: {
          type: 'string',
          title: this.i18n.t('texts.extensions.common.modelName'),
          required: true,
        },
        temperature: {
          type: 'number',
          title: this.i18n.t('texts.extensions.common.temperature'),
          minimum: 0,
          maximum: 2,
          format: 'slider',
          description: this.i18n.t('texts.extensions.common.temperatureHint'),
        },
        seed: {
          type: 'number',
          title: this.i18n.t('texts.extensions.common.seed'),
          description: this.i18n.t('texts.extensions.common.seedHint'),
        },
        presencePenalty: {
          type: 'number',
          title: this.i18n.t('texts.extensions.common.presencePenalty'),
          minimum: 0,
          maximum: 2,
          default: 0,
          format: 'slider',
          description: this.i18n.t('texts.extensions.common.presencePenaltyHint'),
        },
        frequencyPenalty: {
          type: 'number',
          title: this.i18n.t('texts.extensions.common.frequencyPenalty'),
          minimum: 0,
          maximum: 2,
          default: 0,
          format: 'slider',
          description: this.i18n.t('texts.extensions.common.frequencyPenaltyHint'),
        },
        effort: {
          type: 'string',
          title: this.i18n.t('texts.extensions.common.effort'),
          required: false,
          enum: ['', 'low', 'medium', 'high'],
        },
      },
    };
  }

  async test(configuration: NvidiaModelExtensionConfiguration) {
    const { model, options } = this.createModel(configuration);

    const { text } = await generateText({
      model,
      prompt: 'Just a test call',
      ...options,
    });

    return text != null;
  }

  getMiddlewares(_: User, extension: ExtensionEntity<NvidiaModelExtensionConfiguration>): Promise<ChatMiddleware[]> {
    const middleware = {
      invoke: async (context: ChatContext, _: GetContext, next: ChatNextDelegate): Promise<any> => {
        context.llms[this.spec.name] = await context.cache.get(this.spec.name, extension.values, () => {
          return this.createModel(extension.values, true);
        });

        return next(context);
      },
    };

    return Promise.resolve([middleware]);
  }

  private createModel(config: NvidiaModelExtensionConfiguration, streaming = false) {
    const open = createOpenAICompatible({
      name: 'nvidia',
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      includeUsage: true,
    });

    return {
      model: open(config.modelName),
      options: {
        presencePenalty: config.presencePenalty,
        frequencyPenalty: config.frequencyPenalty,
        seed: config.seed,
        streaming,
        providerOptions: {
          openai: {
            reasoningEffort: config.effort,
          },
        },
      } as Partial<CallSettings>,
    };
  }
}

type NvidiaModelExtensionConfiguration = ExtensionConfiguration & {
  apiKey: string;
  baseUrl: string;
  modelName: string;
  temperature: number;
  seed: number;
  presencePenalty: number;
  frequencyPenalty: number;
  effort?: 'minimal' | 'low' | 'medium' | 'high';
};
