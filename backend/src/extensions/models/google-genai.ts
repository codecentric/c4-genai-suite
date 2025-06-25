import { CallbackHandlerMethods } from '@langchain/core/callbacks/base';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { createToolCallingAgent } from 'langchain/agents';
import { ChatContext, ChatMiddleware, ChatNextDelegate, GetContext } from 'src/domain/chat';
import { Extension, ExtensionConfiguration, ExtensionEntity, ExtensionSpec } from 'src/domain/extensions';
import { User } from 'src/domain/users';
import { I18nService } from '../../localization/i18n.service';
import { getEstimatedUsageCallback } from './internal/utils';

@Extension()
export class GoogleGenAIModelExtension implements Extension<VertexAIModelExtensionConfiguration> {
  constructor(private readonly i18n: I18nService) {}

  get spec(): ExtensionSpec {
    return {
      name: 'google-genai-model',
      title: this.i18n.t('texts.extensions.googleGenai.title'),
      logo: '<svg height="206" preserveAspectRatio="xMidYMid" width="256" xmlns="http://www.w3.org/2000/svg"><path d="m170.252 56.819 22.253-22.253 1.483-9.37C153.437-11.677 88.976-7.496 52.42 33.92 42.267 45.423 34.734 59.764 30.717 74.573l7.97-1.123 44.505-7.34 3.436-3.513c19.797-21.742 53.27-24.667 76.128-6.168z" fill="#ea4335"/><path d="M224.205 73.918a100.249 100.249 0 0 0-30.217-48.722l-31.232 31.232a55.515 55.515 0 0 1 20.379 44.037v5.544c15.35 0 27.797 12.445 27.797 27.796 0 15.352-12.446 27.485-27.797 27.485h-55.671l-5.466 5.934v33.34l5.466 5.231h55.67c39.93.311 72.553-31.494 72.864-71.424a72.303 72.303 0 0 0-31.793-60.453" fill="#4285f4"/><path d="M71.87 205.796h55.593V161.29H71.87a27.275 27.275 0 0 1-11.399-2.498l-7.887 2.42-22.409 22.253-1.952 7.574c12.567 9.489 27.9 14.825 43.647 14.757" fill="#34a853"/><path d="M71.87 61.425C31.94 61.664-.237 94.228.001 134.159a72.301 72.301 0 0 0 28.222 56.88l32.248-32.247c-13.99-6.32-20.208-22.786-13.887-36.776 6.32-13.99 22.786-20.207 36.775-13.887a27.796 27.796 0 0 1 13.887 13.887l32.248-32.247A72.224 72.224 0 0 0 71.87 61.425" fill="#fbbc05"/></svg>',
      description: this.i18n.t('texts.extensions.googleGenai.description'),
      type: 'llm',
      arguments: {
        modelName: {
          type: 'string',
          title: this.i18n.t('texts.extensions.common.modelName'),
          required: true,
          format: 'select',
          enum: [
            'gemini-2.5-flash-preview-04-17',
            'gemini-2.5-pro-preview-03-25',
            'gemini-2.0-flash-lite-001',
            'gemini-2.0-flash-001',
            'gemini-2.0-flash-thinking-exp-01-21',
          ],
          showInList: true,
        },
        apiKey: {
          type: 'string',
          title: this.i18n.t('texts.extensions.common.apiKey'),
          required: true,
          format: 'password',
        },
        temperature: {
          type: 'number',
          title: this.i18n.t('texts.extensions.common.temperature'),
          minimum: 0,
          maximum: 2,
          format: 'slider',

          description: this.i18n.t('texts.extensions.common.temperatureHint'),
        },
        topK: {
          type: 'number',
          title: this.i18n.t('texts.extensions.common.topK'),
          multipleOf: 1,
          minimum: 1,
          maximum: 128,
          default: 64,
          format: 'slider',
          description: this.i18n.t('texts.extensions.googleGenai.topKHint'),
        },
        topP: {
          type: 'number',
          title: this.i18n.t('texts.extensions.common.topP'),
          minimum: 0,
          maximum: 1,
          default: 0.95,
          format: 'slider',
          description: this.i18n.t('texts.extensions.googleGenai.topPHint'),
        },
      },
    };
  }

  async test(configuration: VertexAIModelExtensionConfiguration) {
    const model = this.createModel(configuration);

    await model.invoke('Just a test call');
  }

  getMiddlewares(_: User, extension: ExtensionEntity<VertexAIModelExtensionConfiguration>): Promise<ChatMiddleware[]> {
    const middleware = {
      invoke: async (context: ChatContext, getContext: GetContext, next: ChatNextDelegate): Promise<any> => {
        context.llms[this.spec.name] = await context.cache.get('google-genai', extension.values, () => {
          // The model does not provide the token usage, therefore estimate it.
          const callbacks = [getEstimatedUsageCallback('google-genai', extension.values.modelName, getContext)];
          return this.createModel(extension.values, callbacks);
        });
        context.agentFactory = createToolCallingAgent;

        return next(context);
      },
    };

    return Promise.resolve([middleware]);
  }

  private createModel(configuration: VertexAIModelExtensionConfiguration, callbacks?: CallbackHandlerMethods[]) {
    const { modelName, apiKey, temperature, topP, topK } = configuration;

    return new ChatGoogleGenerativeAI({ model: modelName, apiKey, temperature, topP, topK, callbacks });
  }
}

type VertexAIModelExtensionConfiguration = ExtensionConfiguration & {
  modelName: string;
  apiKey: string;
  temperature: number;
  topK: number;
  topP: number;
};
