import { Logger } from '@nestjs/common';
import { z } from 'zod';
import { ChatContext, ChatMiddleware, ChatNextDelegate, GetContext, NamedStructuredTool } from 'src/domain/chat';
import { Extension, ExtensionConfiguration, ExtensionEntity, ExtensionSpec } from 'src/domain/extensions';
import { User } from 'src/domain/users';
import { I18nService } from '../../localization/i18n.service';

@Extension()
export class AzureAISearchExtension implements Extension<AzureAISearchExtensionConfiguration> {
  constructor(private readonly i18n: I18nService) {}

  get spec(): ExtensionSpec {
    return {
      name: 'azure-ai-search',
      title: this.i18n.t('texts.extensions.azureSearch.title'),
      logo: '<svg id="f470e112-f1d8-4c18-a381-9b54e11a9ca3" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18"><defs><linearGradient id="b198f9ad-224e-4f37-99bb-f1c5a20d3916" x1="9" y1="0.36" x2="9" y2="18.31" gradientUnits="userSpaceOnUse"><stop offset="0.18" stop-color="#5ea0ef" /><stop offset="1" stop-color="#0078d4" /></linearGradient></defs><title>Icon-web-44</title><path d="M18,11.32a4.12,4.12,0,0,0-3.51-4,5.15,5.15,0,0,0-5.25-5,5.25,5.25,0,0,0-5,3.49A4.86,4.86,0,0,0,0,10.59a5,5,0,0,0,5.07,4.82l.44,0h8.21a.78.78,0,0,0,.22,0A4.13,4.13,0,0,0,18,11.32Z" fill="url(#b198f9ad-224e-4f37-99bb-f1c5a20d3916)" /><path d="M12.33,6.59a3.07,3.07,0,0,0-5.61.85,3.16,3.16,0,0,0,.33,2.27L4.71,12.08a.79.79,0,0,0,0,1.12.78.78,0,0,0,.56.23.76.76,0,0,0,.56-.23l2.33-2.36a3.14,3.14,0,0,0,.81.33,3.08,3.08,0,0,0,3.36-4.58Zm-.54,2.1A2.16,2.16,0,0,1,9.7,10.34a1.79,1.79,0,0,1-.51-.07,1.87,1.87,0,0,1-.7-.32,2.13,2.13,0,0,1-.56-.56,2.17,2.17,0,0,1-.31-1.73A2.14,2.14,0,0,1,9.7,6a2.31,2.31,0,0,1,.52.06,2.18,2.18,0,0,1,1.32,1A2.13,2.13,0,0,1,11.79,8.69Z" fill="#f2f2f2" /><ellipse cx="9.69" cy="8.18" rx="2.15" ry="2.16" fill="#83b9f9" /></svg>',
      description: this.i18n.t('texts.extensions.azureSearch.description'),
      type: 'tool',
      arguments: {
        apiKey: {
          type: 'string',
          title: this.i18n.t('texts.extensions.common.apiKey'),
          required: true,
          format: 'password',
          description: this.i18n.t('texts.extensions.azureSearch.apiKeyHint'),
        },
        endpoint: {
          type: 'string',
          title: this.i18n.t('texts.extensions.common.endpoint'),
          required: true,
          description: this.i18n.t('texts.extensions.azureSearch.endpointHint'),
        },
        indexName: {
          type: 'string',
          title: this.i18n.t('texts.extensions.common.index'),
          description: this.i18n.t('texts.extensions.azureSearch.indexHint'),
          required: true,
        },
        vectorField: {
          type: 'string',
          title: this.i18n.t('texts.extensions.common.vectorColumn'),
          description: this.i18n.t('texts.extensions.azureSearch.vectorColumnHint'),
        },
        select: {
          type: 'string',
          title: this.i18n.t('texts.extensions.common.select'),
          required: true,
          description: this.i18n.t('texts.extensions.azureSearch.selectHint'),
        },
        description: {
          type: 'string',
          title: this.i18n.t('texts.extensions.common.instructions'),
          description: this.i18n.t('texts.extensions.azureSearch.instructionsHint'),
          format: 'textarea',
        },
        topK: {
          type: 'number',
          title: this.i18n.t('texts.extensions.common.topK'),
          description: this.i18n.t('texts.extensions.azure.topKHint'),
        },
      },
    };
  }

  getMiddlewares(_user: User, extension: ExtensionEntity<AzureAISearchExtensionConfiguration>): Promise<ChatMiddleware[]> {
    const middleware = {
      invoke: async (context: ChatContext, _: GetContext, next: ChatNextDelegate): Promise<any> => {
        context.tools.push(new InternalTool(extension.values, extension.externalId));
        return next(context);
      },
    };

    return Promise.resolve([middleware]);
  }
}

class InternalTool extends NamedStructuredTool {
  readonly name: string;
  readonly description: string;
  readonly displayName = 'Azure AI Search';
  readonly apiVersion = '2024-05-01-preview';
  readonly endpoint: string;
  readonly indexName: string;
  readonly apiKey: string;
  readonly topK: number;
  readonly select: string;
  readonly vectorField: string;
  private readonly logger = new Logger(InternalTool.name);

  readonly schema = z.object({
    query: z.string().describe('A precise search query containing keywords, phrases or questions.'),
  });

  constructor(configuration: AzureAISearchExtensionConfiguration, extensionExternalId: string) {
    super();

    this.name = extensionExternalId;

    this.endpoint = configuration.endpoint;
    this.indexName = configuration.indexName;
    this.apiKey = configuration.apiKey;
    this.topK = configuration.topK || 10;
    this.select = configuration.select;
    this.vectorField = configuration.vectorField || 'text_vector';
    this.description =
      configuration.description ||
      'Performs a semantic search using Azure AI Search. Returns only the top K matching chunks. Results may be incomplete.';
  }

  protected async _call(arg: z.infer<typeof this.schema>): Promise<string> {
    const { query } = arg;
    try {
      const response = await fetch(`${this.endpoint}/indexes/${this.indexName}/docs/search?api-version=${this.apiVersion}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'api-key': this.apiKey,
        },
        body: JSON.stringify({
          select: this.select,
          vectorQueries: [
            {
              kind: 'text',
              text: query,
              fields: this.vectorField,
              k: this.topK,
            },
          ],
        }),
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }
      const data = (await response.json()) as AzureAISearchResponse;
      return JSON.stringify(data.value);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error occurred in extension ${this.name}: ${error.message}`, error.stack);
      } else {
        this.logger.error(`Unknown error occurred in extension ${this.name}: ${JSON.stringify(error)}`);
      }
      return 'There was an error with the search.';
    }
  }
}

// we omit odata fields starting with @
// see also https://learn.microsoft.com/en-us/rest/api/searchservice/search-documents#response
type AzureAISearchResponse = {
  value: Record<string, string>[];
};

type AzureAISearchExtensionConfiguration = ExtensionConfiguration & {
  apiKey: string;
  endpoint: string;
  indexName: string;
  vectorField: string;
  select: string;
  description: string;
  topK: number;
};
