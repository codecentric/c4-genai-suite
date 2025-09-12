import { CallbackHandlerMethods } from '@langchain/core/callbacks/base';
import { LLMResult } from '@langchain/core/outputs';
import { AzureChatOpenAI } from '@langchain/openai';
import { ChatContext, ChatMiddleware, ChatNextDelegate, GetContext } from 'src/domain/chat';
import { Extension, ExtensionConfiguration, ExtensionEntity, ExtensionSpec } from 'src/domain/extensions';
import { User } from 'src/domain/users';
import { I18nService } from '../../localization/i18n.service';
import { getEstimatedUsageCallback } from './internal/utils';

@Extension()
export class AzureOpenAIReasoningModelExtension implements Extension<AzureOpenAIReasoningModelExtensionConfiguration> {
  constructor(private readonly i18n: I18nService) {}

  get spec(): ExtensionSpec {
    return {
      name: 'azure-open-ai-model-reasoning',
      title: this.i18n.t('texts.extensions.azure-o.title'),
      logo: '<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="a" x1="-1032.172" x2="-1059.213" y1="145.312" y2="65.426" gradientTransform="matrix(1 0 0 -1 1075 158)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#114a8b"/><stop offset="1" stop-color="#0669bc"/></linearGradient><linearGradient id="b" x1="-1023.725" x2="-1029.98" y1="108.083" y2="105.968" gradientTransform="matrix(1 0 0 -1 1075 158)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-opacity=".3"/><stop offset=".071" stop-opacity=".2"/><stop offset=".321" stop-opacity=".1"/><stop offset=".623" stop-opacity=".05"/><stop offset="1" stop-opacity="0"/></linearGradient><linearGradient id="c" x1="-1027.165" x2="-997.482" y1="147.642" y2="68.561" gradientTransform="matrix(1 0 0 -1 1075 158)" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#3ccbf4"/><stop offset="1" stop-color="#2892df"/></linearGradient></defs><path fill="url(#a)" d="M33.338 6.544h26.038l-27.03 80.087a4.152 4.152 0 0 1-3.933 2.824H8.149a4.145 4.145 0 0 1-3.928-5.47L29.404 9.368a4.152 4.152 0 0 1 3.934-2.825z"/><path fill="#0078d4" d="M71.175 60.261h-41.29a1.911 1.911 0 0 0-1.305 3.309l26.532 24.764a4.171 4.171 0 0 0 2.846 1.121h23.38z"/><path fill="url(#b)" d="M33.338 6.544a4.118 4.118 0 0 0-3.943 2.879L4.252 83.917a4.14 4.14 0 0 0 3.908 5.538h20.787a4.443 4.443 0 0 0 3.41-2.9l5.014-14.777 17.91 16.705a4.237 4.237 0 0 0 2.666.972H81.24L71.024 60.261l-29.781.007L59.47 6.544z"/><path fill="url(#c)" d="M66.595 9.364a4.145 4.145 0 0 0-3.928-2.82H33.648a4.146 4.146 0 0 1 3.928 2.82l25.184 74.62a4.146 4.146 0 0 1-3.928 5.472h29.02a4.146 4.146 0 0 0 3.927-5.472z"/></svg>',
      description: this.i18n.t('texts.extensions.azure-o.description'),
      type: 'llm',
      arguments: {
        apiKey: {
          type: 'string',
          title: this.i18n.t('texts.extensions.common.apiKey'),
          required: true,
          format: 'password',
        },
        deploymentName: {
          type: 'string',
          title: this.i18n.t('texts.extensions.common.deploymentName'),
          required: true,
        },
        instanceName: {
          type: 'string',
          title: this.i18n.t('texts.extensions.common.instanceName'),
          required: true,
        },
        apiVersion: {
          type: 'string',
          title: this.i18n.t('texts.extensions.common.apiVersion'),
          required: true,
          format: 'select',
          examples: ['2024-12-01-preview'],
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

  async test(configuration: AzureOpenAIReasoningModelExtensionConfiguration) {
    const model = this.createModel(configuration);

    await model.invoke('Just a test call');
  }

  getMiddlewares(
    _user: User,
    extension: ExtensionEntity<AzureOpenAIReasoningModelExtensionConfiguration>,
  ): Promise<ChatMiddleware[]> {
    const middleware = {
      invoke: async (context: ChatContext, getContext: GetContext, next: ChatNextDelegate): Promise<any> => {
        context.llms[this.spec.name] = await context.cache.get(this.spec.name, extension.values, () => {
          // The model does not provide the token usage, therefore estimate it.
          const callbacks = [
            getEstimatedUsageCallback('azure-open-ai-reasoning', extension.values.deploymentName, getContext),
            // Custom callback to capture thinking responses
            {
              handleLLMStart: () => {
                const currentContext = getContext();
                if (currentContext?.result) {
                  currentContext.result.next({ type: 'thinking', content: '', thinking_type: 'start' });
                }
              },
              handleLLMEnd: (output: LLMResult) => {
                const currentContext = getContext();
                if (currentContext?.result) {
                  // Check if the output contains reasoning information
                  const reasoning = output?.generations?.[0]?.[0]?.generationInfo?.reasoning;
                  if (reasoning) {
                    currentContext.result.next({ type: 'thinking', content: reasoning, thinking_type: 'content' });
                  }
                  currentContext.result.next({ type: 'thinking', content: '', thinking_type: 'end' });
                }
              },
            },
          ];

          // Stream the result token by token to the frontend.
          return this.createModel(extension.values, callbacks, true);
        });

        return next(context);
      },
    };

    return Promise.resolve([middleware]);
  }

  private createModel(
    configuration: AzureOpenAIReasoningModelExtensionConfiguration,
    callbacks?: CallbackHandlerMethods[],
    streaming = false,
  ) {
    const { apiKey, apiVersion, deploymentName, instanceName, effort } = configuration;

    return new AzureChatOpenAI({
      azureOpenAIApiDeploymentName: deploymentName,
      azureOpenAIApiInstanceName: instanceName,
      azureOpenAIApiKey: apiKey,
      azureOpenAIApiVersion: apiVersion,
      callbacks,
      streaming,
      reasoning: effort ? { effort } : undefined,
    });
  }
}

type AzureOpenAIReasoningModelExtensionConfiguration = ExtensionConfiguration & {
  apiKey: string;
  deploymentName: string;
  instanceName: string;
  apiVersion: string;
  effort?: 'low' | 'medium' | 'high';
};
