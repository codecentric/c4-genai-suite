import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {
  CallToolRequest,
  CallToolResultSchema,
  ElicitRequestSchema,
  ListToolsResultSchema,
  McpError,
  ReadResourceRequest,
  ReadResourceResultSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { JsonSchemaObject, jsonSchemaToZod } from '@n8n/json-schema-to-zod';
import type { JsonSchema } from '@n8n/json-schema-to-zod/dist/types/types';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { diff } from 'json-diff-ts';
import { renderString } from 'nunjucks';
import { z } from 'zod';
import {
  ChatContext,
  ChatMiddleware,
  ChatNextDelegate,
  FormActionType,
  GetContext,
  NamedDynamicStructuredTool,
} from 'src/domain/chat';
import {
  Extension,
  ExtensionArgument,
  ExtensionEntity,
  ExtensionObjectArgument,
  ExtensionSpec,
  ExtensionStringArgument,
} from 'src/domain/extensions';
import { User } from 'src/domain/users';
import { I18nService } from '../../localization/i18n.service';
import { transformMCPToolResponse } from './mcp-types/transformer';

function jsonSchemaToZodInternal(schema: JsonSchema): z.ZodObject<z.ZodRawShape> {
  return jsonSchemaToZod(schema);
}

type MCPListToolsResultSchema = z.infer<typeof ListToolsResultSchema>;

enum Transport {
  SSE = 'sse',
  STREAMABLE_HTTP = 'streamableHttp',
}

type ConfigurationAttributeSource = 'llm' | 'user' | 'admin';

type ConfigurationAttributes = Record<
  // one record per value
  string,
  {
    source: ConfigurationAttributeSource;
    value: any;
  }
>;

interface Configuration {
  serverName: string;
  endpoint: string;
  headers?: string;
  transport: Transport;
  schema?: Record<
    // one record per method
    string,
    {
      enabled: boolean;
      description?: string;
      attributes?: ConfigurationAttributes;
    }
  >;
}

interface ExtensionState extends Pick<Configuration, 'endpoint'> {
  tools?: MCPListToolsResultSchema['tools'];
  changed?: boolean;
}

// zod has no password type since it is handled as string so we introduce a whitelist to map password fields
const passwordKeys = ['apiKey', 'api-key', 'password', 'credentials'];

function toExtensionArgument(
  schema: JsonSchemaObject & { title?: string; description?: string },
  options: { key?: string; required?: boolean; forceRequired?: boolean },
): ExtensionArgument | undefined {
  const required = options.forceRequired ?? options.required ?? false;

  if (schema.type === 'number' || schema.type === 'integer') {
    return {
      type: 'number',
      title: schema.title ?? options.key ?? '',
      format: schema.format as 'input',
      minimum: schema.minimum,
      maximum: schema.maximum,
      multipleOf: schema.type === 'number' ? schema.multipleOf : 1,
      required,
    };
  } else if (schema.type === 'string') {
    const format = options.key && passwordKeys.includes(options.key) ? 'password' : (schema.format as 'input');

    return {
      type: 'string',
      title: schema.title ?? options.key ?? '',
      enum: schema.enum as string[],
      format,
      required,
    };
  } else if (schema.type === 'boolean') {
    return {
      type: 'boolean',
      title: schema.title ?? options.key ?? '',
      required,
    };
  } else if (schema.type === 'object') {
    return {
      type: 'object',
      title: schema.title ?? options.key ?? '',
      required,
      properties: Object.entries(schema.properties ?? {}).reduce(
        (prev, [key, type]) => {
          const propertyRequired = options.forceRequired ?? (Array.isArray(schema.required) && schema.required.includes(key));
          const propertyType = toExtensionArgument(type as JsonSchemaObject, {
            key,
            required: propertyRequired,
            forceRequired: options.forceRequired,
          });
          if (propertyType) {
            prev[key] = propertyType;
          }
          return prev;
        },
        {} as Record<string, ExtensionArgument>,
      ),
    };
  } else if (schema.type === 'array') {
    const arrayItemType = toExtensionArgument(schema.items as JsonSchemaObject, {
      required: true,
      forceRequired: options.forceRequired,
    });
    if (!arrayItemType || (arrayItemType.type !== 'string' && arrayItemType.type !== 'number')) {
      return;
    }

    return {
      type: 'array',
      title: schema.title ?? options?.key ?? '',
      required,
      items: arrayItemType,
      default: schema.default as any[],
    };
  }
}

function toArguments(i18n: I18nService, tools: MCPListToolsResultSchema['tools']) {
  return tools.reduce(
    (toolObject, tool) => {
      const methodSchema = tool.inputSchema as JsonSchemaObject;
      toolObject.properties[tool.name] = Object.entries(methodSchema.properties ?? {}).reduce(
        (methodObject, [name, type]) => {
          const methodType = type as JsonSchemaObject;
          const innerMethodType = toExtensionArgument(methodType, { key: name, forceRequired: false });
          if (!innerMethodType) {
            return methodObject;
          }

          methodObject.properties.attributes.properties[name] = {
            type: 'object',
            title: name,
            description: methodType.description,
            properties: {
              source: {
                type: 'string',
                title: i18n.t('texts.extensions.mcpTools.source'),
                description: i18n.t('texts.extensions.mcpTools.sourceHint'),
                required: true,
                enum: ['llm', 'user', 'admin'],
                default: 'llm',
              },
              value: {
                ...innerMethodType,
                title: i18n.t('texts.extensions.mcpTools.value'),
                description: i18n.t('texts.extensions.mcpTools.valueHint'),
              },
            },
          };
          return methodObject;
        },
        {
          type: 'object',
          title: tool.name,
          properties: {
            enabled: {
              type: 'boolean',
              title: i18n.t('texts.extensions.mcpTools.enabled'),
              default: false,
              description: i18n.t('texts.extensions.mcpTools.enabledHint'),
            },
            description: {
              type: 'string',
              format: 'textarea',
              title: i18n.t('texts.extensions.mcpTools.toolDescription'),
              required: (tool.description?.length ?? 0) > 1024,
              default: tool.description,
              description: i18n.t('texts.extensions.mcpTools.toolDescriptionHint'),
            },
            attributes: { type: 'object', title: '', properties: {} as { [name: string]: ExtensionArgument } },
          },
        } satisfies ExtensionObjectArgument,
      );
      return toolObject;
    },
    { type: 'object', title: `Schema`, properties: {}, required: true } as ExtensionObjectArgument,
  );
}

function toUserArguments(values: Configuration, schemaArgument: ExtensionObjectArgument) {
  return Object.entries(values.schema ?? {}).reduce(
    (userArguments, [methodName, methodConfig]) => {
      if (methodConfig.enabled) {
        const schemaObjectArgument = schemaArgument.properties?.[methodName] as ExtensionObjectArgument;
        const descriptionArgument = schemaObjectArgument?.properties?.['description'] as ExtensionStringArgument;
        const attributesArgument = schemaObjectArgument?.properties?.['attributes'] as ExtensionObjectArgument;
        const methodArguments = {
          type: 'object',
          title: methodName,
          description: methodConfig?.description || descriptionArgument.default || '',
          properties: Object.entries(methodConfig.attributes ?? {}).reduce(
            (prev, [key, value]) => {
              if (value.source === 'user') {
                const parameterArgument = attributesArgument?.properties?.[key] as ExtensionObjectArgument;
                const valuesArguments = parameterArgument?.properties?.['value'];
                if (valuesArguments) {
                  prev[key] = { ...valuesArguments, title: key, description: parameterArgument?.description };
                }
              }

              return prev;
            },
            {} as Record<string, ExtensionArgument>,
          ),
        } as ExtensionObjectArgument;
        if (Object.keys(methodArguments.properties).length) {
          userArguments[methodName] = methodArguments;
        }
      }

      return userArguments;
    },
    {} as { [name: string]: ExtensionObjectArgument },
  );
}

@Extension()
@Injectable()
export class MCPToolsExtension implements Extension<Configuration> {
  private logger = new Logger(this.constructor.name);

  constructor(protected readonly i18n: I18nService) {}

  get spec(): ExtensionSpec {
    return {
      name: 'mcp',
      title: this.i18n.t('texts.extensions.mcpTools.title'),
      logo: '<svg fill="currentColor" fill-rule="evenodd" height="1em" style="flex:none;line-height:1" viewBox="0 0 24 24" width="1em" xmlns="http://www.w3.org/2000/svg"><title>ModelContextProtocol</title><path d="M15.688 2.343a2.588 2.588 0 00-3.61 0l-9.626 9.44a.863.863 0 01-1.203 0 .823.823 0 010-1.18l9.626-9.44a4.313 4.313 0 016.016 0 4.116 4.116 0 011.204 3.54 4.3 4.3 0 013.609 1.18l.05.05a4.115 4.115 0 010 5.9l-8.706 8.537a.274.274 0 000 .393l1.788 1.754a.823.823 0 010 1.18.863.863 0 01-1.203 0l-1.788-1.753a1.92 1.92 0 010-2.754l8.706-8.538a2.47 2.47 0 000-3.54l-.05-.049a2.588 2.588 0 00-3.607-.003l-7.172 7.034-.002.002-.098.097a.863.863 0 01-1.204 0 .823.823 0 010-1.18l7.273-7.133a2.47 2.47 0 00-.003-3.537z"></path><path d="M14.485 4.703a.823.823 0 000-1.18.863.863 0 00-1.204 0l-7.119 6.982a4.115 4.115 0 000 5.9 4.314 4.314 0 006.016 0l7.12-6.982a.823.823 0 000-1.18.863.863 0 00-1.204 0l-7.119 6.982a2.588 2.588 0 01-3.61 0 2.47 2.47 0 010-3.54l7.12-6.982z"></path></svg>',
      description: this.i18n.t('texts.extensions.mcpTools.description'),
      type: 'tool',
      triggers: ['endpoint', 'transport', 'headers'],
      arguments: {
        serverName: {
          type: 'string',
          title: this.i18n.t('texts.extensions.mcpTools.serverName'),
          description: this.i18n.t('texts.extensions.mcpTools.serverNameHint'),
          required: true,
          showInList: true,
        },
        endpoint: {
          type: 'string',
          title: this.i18n.t('texts.extensions.mcpTools.endpoint'),
          description: this.i18n.t('texts.extensions.mcpTools.endpointHint'),
          required: true,
        },
        transport: {
          type: 'string',
          title: this.i18n.t('texts.extensions.mcpTools.transport'),
          description: this.i18n.t('texts.extensions.mcpTools.transportHint'),
          required: false,
          default: 'sse',
          enum: Object.values(Transport),
        },
        headers: {
          type: 'string',
          title: this.i18n.t('texts.extensions.common.headers'),
          description: this.i18n.t('texts.extensions.mcpTools.headersHint'),
          format: 'textarea',
          required: false,
        },
      },
    };
  }

  toolsChanged(before: z.infer<typeof ListToolsResultSchema>['tools'], after: z.infer<typeof ListToolsResultSchema>['tools']) {
    return diff(before, after);
  }

  async buildSpec(
    extension: ExtensionEntity<Configuration>,
    throwOnError: boolean,
    forceRebuild: boolean,
  ): Promise<ExtensionSpec> {
    const spec = this.spec;
    const state = (extension.state ?? {}) as ExtensionState;
    const values = extension.values;

    try {
      const changed = values.endpoint !== state?.endpoint;

      if (changed || !state.tools || forceRebuild) {
        const { tools } = await this.getTools(values);
        this.resetUnmodifiedDescriptionNames(values.schema, tools);
        if (state.tools) {
          this.resetUnmodifiedDescriptionNames(values.schema, state.tools);
          const changes = this.toolsChanged(state.tools, tools);
          state.changed = changes.length > 0;
        }

        state.tools = tools;
        state.endpoint = values.endpoint;
      } else {
        state.changed = false;
      }

      spec.arguments['schema'] = toArguments(this.i18n, state.tools);
      spec.userArguments = {
        type: 'object',
        title: values.serverName,
        description: '',
        properties: toUserArguments(values, spec.arguments['schema']),
      };
    } catch (err) {
      const errorMessage = `Cannot connect to mcp tool`;

      this.logger.error(errorMessage, err);
      delete state.tools;
      delete spec.arguments['schema'];
      delete spec.userArguments;
      delete state.changed;
      values.schema = {};
      if (throwOnError) {
        throw new BadRequestException(errorMessage);
      }
    }

    return spec;
  }

  async getDocument(configuration: Configuration, documentUri: string) {
    const { client } = (await this.getTools(configuration)) ?? [];
    const req: ReadResourceRequest = {
      method: 'resources/read',
      params: { uri: documentUri },
    };
    const res = await client.request(req, ReadResourceResultSchema);
    const content = res.contents[0];

    const base64String = content.blob as string;
    const binaryString = atob(base64String);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const file = new File([bytes], content.uri, { type: content.mimeType });

    return Promise.resolve(file);
  }

  async test(configuration: Configuration) {
    return this.getTools(configuration);
  }

  private resetUnmodifiedDescriptionNames(
    schema: Configuration['schema'],
    tools: z.infer<typeof ListToolsResultSchema>['tools'],
  ) {
    if (!schema) {
      return;
    }

    tools.forEach((tool) => {
      if (schema[tool.name]?.description && schema[tool.name].description === tool.description) {
        delete schema[tool.name].description;
      }
    });
  }

  private applyTemplates(context: ChatContext, templateArgs: Record<string, any>, args?: Record<string, any>) {
    const templateKeys = Object.keys(templateArgs);

    return Object.fromEntries(
      Object.entries(args ?? templateArgs).map(([key, value]) => [
        key,
        typeof value === 'string' && typeof templateArgs[key] === 'string' && templateArgs[key]
          ? renderString(templateArgs[key], {
              ...context,
              language: this.i18n.language,
              value,
            })
          : templateKeys.includes(key)
            ? value
            : undefined,
      ]),
    );
  }

  private getTemplateArgs(attributes: ConfigurationAttributes, source: ConfigurationAttributeSource) {
    return Object.fromEntries(
      Object.entries(attributes)
        .filter(([_, attribute]) => attribute.source === source)
        .map(([key, attribute]) => [key, attribute.value ?? null]),
    );
  }

  private enableElicitRequests(client: Client, context: ChatContext) {
    client.setRequestHandler(ElicitRequestSchema, async (request) => {
      const schema = toExtensionArgument(request.params.requestedSchema as JsonSchemaObject, {});
      if (schema) {
        const userResponse = await context.ui.form(request.params.message, schema);
        return {
          action: userResponse.action,
          content: userResponse.action === FormActionType.ACCEPT ? userResponse.data : undefined,
        };
      }

      // the schema is invalid or not supported
      return {
        action: 'cancel',
        content: undefined,
      };
    });
  }

  async getMiddlewares(
    _user: User,
    extension: ExtensionEntity<Configuration>,
    userArgs?: Record<string, Record<string, any>>,
  ): Promise<ChatMiddleware[]> {
    const middleware = {
      invoke: async (context: ChatContext, _: GetContext, next: ChatNextDelegate): Promise<any> => {
        const { tools, client } = (await this.getTools(extension.values)) ?? [];
        this.enableElicitRequests(client, context);
        const schemaData = extension.values.schema ?? {};

        const filteredTools = tools.filter((x) => schemaData[x.name]?.enabled);

        context.tools.push(
          ...filteredTools.map(({ name, description, inputSchema }) => {
            const params = schemaData[name];
            const schema = inputSchema as JsonSchemaObject;
            // only expose attributes that are configured to be defined by the llm
            schema.properties = Object.fromEntries(
              Object.entries(schema.properties ?? {}).filter(([key]) => params.attributes?.[key]?.source === 'llm'),
            );

            const userDefinedArgs = userArgs?.[name] ?? {};
            const displayName = `${extension.values.serverName}: ${name}`;

            return new NamedDynamicStructuredTool({
              displayName,
              name: `${extension.externalId}_${name}`,
              description: params.description || description || name,
              schema: jsonSchemaToZodInternal(schema),
              func: async (args: Record<string, any>) => {
                const attributes = params.attributes ?? {};
                const adminArgs = this.applyTemplates(context, this.getTemplateArgs(attributes, 'admin'));
                const llmArgs = this.applyTemplates(context, this.getTemplateArgs(attributes, 'llm'), args);
                const userArgs = this.applyTemplates(context, this.getTemplateArgs(attributes, 'user'), userDefinedArgs);
                this.logger.log(`Calling function ${name}`);

                try {
                  const req: CallToolRequest = {
                    method: 'tools/call',
                    params: { name, arguments: { ...llmArgs, ...adminArgs, ...userArgs } },
                  };
                  const res = await client.request(req, CallToolResultSchema);
                  const { sources, content } = transformMCPToolResponse(res);
                  if (sources.length) {
                    context.history?.addSources(extension.externalId, sources);
                  }

                  return content;
                } catch (err) {
                  context.result.next({
                    type: 'debug',
                    content: this.i18n.t('texts.extensions.mcpTools.errorToolCall', { tool: name }),
                  });
                  if (err instanceof McpError) {
                    this.logger.error('mcpError during tool call', err);
                  } else {
                    this.logger.error('error during tool call', err);
                  }
                  throw err;
                }
              },
            });
          }),
        );
        return next(context);
      },
    };

    return Promise.resolve([middleware]);
  }

  private async getTools(configuration: Configuration) {
    const client = new Client(
      {
        name: 'langchain-js-client',
        version: '1.0.0',
      },
      {
        capabilities: {
          elicitation: {},
        },
      },
    );

    const url = new URL(configuration.endpoint);

    const headers =
      configuration.headers?.split(/\r?\n/).reduce<Record<string, string>>((prev, pair) => {
        const index = pair.indexOf('=');

        if (index >= 0) {
          const key = pair.substring(0, index).trim();
          const value = pair.substring(index + 1).trim();
          if (key && value) {
            prev[key.trim()] = value.trim();
          }
        }

        return prev;
      }, {}) ?? {};

    const transport =
      configuration.transport === Transport.STREAMABLE_HTTP
        ? new StreamableHTTPClientTransport(url, {
            requestInit: { headers },
          })
        : new SSEClientTransport(new URL(url), {
            requestInit: { headers },
          });
    await client.connect(transport);
    const { tools } = await client.request({ method: 'tools/list' }, ListToolsResultSchema);
    return { tools, client };
  }
}
