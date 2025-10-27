import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { CallSettings, generateText } from 'ai';
import { ChatContext, ChatMiddleware, ChatNextDelegate, GetContext } from 'src/domain/chat';
import { Extension, ExtensionConfiguration, ExtensionEntity, ExtensionSpec } from 'src/domain/extensions';
import { User } from 'src/domain/users';
import { fetchWithDebugLogging } from 'src/lib/log-requests';
import { I18nService } from '../../localization/i18n.service';

@Extension()
export class OpenAICompatibleModelExtension implements Extension<OpenAICompatibleModelExtensionConfiguration> {
  constructor(private readonly i18n: I18nService) {}

  get spec(): ExtensionSpec {
    return {
      name: 'open-ai-compatible-model',
      title: this.i18n.t('texts.extensions.openaiCompatible.title'),
      logo: '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 2406 2406"><path d="M1 578.4C1 259.5 259.5 1 578.4 1h1249.1c319 0 577.5 258.5 577.5 577.4V2406H578.4C259.5 2406 1 2147.5 1 1828.6V578.4z" fill="#74aa9c"/><path id="a" d="M1107.3 299.1c-197.999 0-373.9 127.3-435.2 315.3L650 743.5v427.9c0 21.4 11 40.4 29.4 51.4l344.5 198.515V833.3h.1v-27.9L1372.7 604c33.715-19.52 70.44-32.857 108.47-39.828L1447.6 450.3c-86.6-96.8-210.5-151.8-340.3-151.2zm0 117.5-.6.6c79.699 0 156.3 27.5 217.6 78.4-2.5 1.2-7.4 4.3-11 6.1L952.8 709.3c-18.4 10.4-29.4 30-29.4 51.4V1248l-155.1-89.4V755.8c-.1-187.099 151.601-338.9 339-339.2z" fill="#fff"/><use xlink:href="#a" transform="rotate(60 1203 1203)"/><use xlink:href="#a" transform="rotate(120 1203 1203)"/><use xlink:href="#a" transform="rotate(180 1203 1203)"/><use xlink:href="#a" transform="rotate(240 1203 1203)"/><use xlink:href="#a" transform="rotate(300 1203 1203)"/></svg>',
      description: this.i18n.t('texts.extensions.openaiCompatible.description'),
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
          default: 1,
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
          title: this.i18n.t('texts.extensions.common.reasoningEffort'),
          required: false,
          enum: ['', 'low', 'medium', 'high'],
        },
        summary: {
          type: 'string',
          title: this.i18n.t('texts.extensions.common.reasoningSummary'),
          required: false,
          default: 'detailed',
          enum: ['detailed', 'auto'],
        },
      },
    };
  }

  async test(configuration: OpenAICompatibleModelExtensionConfiguration) {
    const { model, options } = this.createModel(configuration);

    const { text } = await generateText({
      model,
      prompt: 'Just a test call',
      ...options,
    });

    return text != null;
  }

  getMiddlewares(_: User, extension: ExtensionEntity<OpenAICompatibleModelExtensionConfiguration>): Promise<ChatMiddleware[]> {
    const middleware = {
      invoke: async (context: ChatContext, getContext: GetContext, next: ChatNextDelegate): Promise<any> => {
        context.llms[this.spec.name] = await context.cache.get(this.spec.name, extension.values, () => {
          return this.createModel(extension.values, true);
        });

        return next(context);
      },
    };

    return Promise.resolve([middleware]);
  }

  private createModel(configuration: OpenAICompatibleModelExtensionConfiguration, streaming = false) {
    const { apiKey, baseUrl, modelName, frequencyPenalty, presencePenalty, temperature, seed, effort, summary } = configuration;

    const open = createOpenAICompatible({
      name: 'openai-compatible',
      apiKey: apiKey,
      baseURL: baseUrl,
      includeUsage: true,
      fetch: fetchWithDebugLogging(OpenAICompatibleModelExtension.name),
    });

    return {
      model: open(modelName),
      options: {
        presencePenalty,
        frequencyPenalty,
        temperature,
        seed,
        streaming,
        providerOptions: {
          openai: effort
            ? {
                reasoningEffort: effort ? effort : undefined,
                reasoningSummary: summary || 'detailed',
              }
            : {},
        },
      } as Partial<CallSettings>,
      modelName: modelName,
      providerName: 'openai-compatible',
    };
  }
}

type OpenAICompatibleModelExtensionConfiguration = ExtensionConfiguration & {
  apiKey: string;
  baseUrl: string;
  modelName: string;
  temperature?: number;
  seed?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  effort?: 'low' | 'medium' | 'high';
  summary?: 'detailed' | 'auto';
};
