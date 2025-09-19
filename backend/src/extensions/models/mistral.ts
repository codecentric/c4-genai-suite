import { createMistral } from '@ai-sdk/mistral';
import { CallSettings, generateText } from 'ai';
import { ChatContext, ChatMiddleware, ChatNextDelegate, GetContext } from 'src/domain/chat';
import { Extension, ExtensionConfiguration, ExtensionEntity, ExtensionSpec } from 'src/domain/extensions';
import { User } from 'src/domain/users';
import { I18nService } from '../../localization/i18n.service';

@Extension()
export class MistralModelExtension implements Extension<MistralModelExtensionConfiguration> {
  constructor(private readonly i18n: I18nService) {}

  get spec(): ExtensionSpec {
    return {
      name: 'mistral-model',
      title: this.i18n.t('texts.extensions.mistral.title'),
      logo: '<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid" viewBox="0 0 256 233"><path d="M186.182 0h46.545v46.545h-46.545z"/><path fill="#F7D046" d="M209.455 0H256v46.545h-46.545z"/><path d="M0 0h46.545v46.545H0zM0 46.545h46.545V93.09H0zM0 93.091h46.545v46.545H0zM0 139.636h46.545v46.545H0zM0 186.182h46.545v46.545H0z"/><path fill="#F7D046" d="M23.273 0h46.545v46.545H23.273z"/><path fill="#F2A73B" d="M209.455 46.545H256V93.09h-46.545zM23.273 46.545h46.545V93.09H23.273z"/><path d="M139.636 46.545h46.545V93.09h-46.545z"/><path fill="#F2A73B" d="M162.909 46.545h46.545V93.09h-46.545zM69.818 46.545h46.545V93.09H69.818z"/><path fill="#EE792F" d="M116.364 93.091h46.545v46.545h-46.545zM162.909 93.091h46.545v46.545h-46.545zM69.818 93.091h46.545v46.545H69.818z"/><path d="M93.091 139.636h46.545v46.545H93.091z"/><path fill="#EB5829" d="M116.364 139.636h46.545v46.545h-46.545z"/><path fill="#EE792F" d="M209.455 93.091H256v46.545h-46.545zM23.273 93.091h46.545v46.545H23.273z"/><path d="M186.182 139.636h46.545v46.545h-46.545z"/><path fill="#EB5829" d="M209.455 139.636H256v46.545h-46.545z"/><path d="M186.182 186.182h46.545v46.545h-46.545z"/><path fill="#EB5829" d="M23.273 139.636h46.545v46.545H23.273z"/><path fill="#EA3326" d="M209.455 186.182H256v46.545h-46.545zM23.273 186.182h46.545v46.545H23.273z"/></svg>',
      description: this.i18n.t('texts.extensions.mistral.description'),
      type: 'llm',
      arguments: {
        apiKey: {
          type: 'string',
          title: this.i18n.t('texts.extensions.common.apiKey'),
          required: true,
          format: 'password',
          description: 'mistral.ai API Key',
          documentationUrl: 'https://docs.mistral.ai/',
        },
        modelName: {
          type: 'string',
          title: this.i18n.t('texts.extensions.common.modelName'),
          required: true,
          format: 'select',
          examples: [
            'open-mistral-7b',
            'open-mixtral-8x7b',
            'mistral-small-latest',
            'mistral-medium-latest',
            'mistral-large-latest',
          ],
          showInList: true,
        },
      },
    };
  }

  async test(configuration: MistralModelExtensionConfiguration) {
    const { model, options } = this.createModel(configuration);

    const { text } = await generateText({
      model,
      prompt: 'Just a test call',
      ...options,
    });

    return text != null;
  }

  getMiddlewares(_: User, extension: ExtensionEntity<MistralModelExtensionConfiguration>): Promise<ChatMiddleware[]> {
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

  private createModel(configuration: MistralModelExtensionConfiguration, streaming = false) {
    const { apiKey, modelName } = configuration;

    const open = createMistral({
      apiKey: apiKey,
    });

    return {
      model: open(modelName),
      options: {
        streaming,
      } as Partial<CallSettings>,
      modelName: modelName,
      providerName: 'mistral',
    };
  }
}

type MistralModelExtensionConfiguration = ExtensionConfiguration & {
  apiKey: string;
  modelName: string;
};
