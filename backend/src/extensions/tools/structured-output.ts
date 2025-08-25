import { StructuredTool } from '@langchain/core/tools';
import { JsonSchema, jsonSchemaToZod } from '@n8n/json-schema-to-zod';
import { z } from 'zod';
import { ChatContext, ChatMiddleware, ChatNextDelegate, GetContext } from 'src/domain/chat';
import { Extension, ExtensionEntity, ExtensionSpec } from 'src/domain/extensions';
import { User } from 'src/domain/users';

type StructuredOutputExtensionConfiguration = {
  schema: string;
};

@Extension()
export class StructuredOutputExtension implements Extension {
  get spec(): ExtensionSpec {
    return {
      name: 'structured-output',
      title: 'Structured Output',
      logo: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" xml:space="preserve"><linearGradient id="a" gradientUnits="userSpaceOnUse" x1="39.446" y1="801.241" x2="182.915" y2="944.694" gradientTransform="matrix(5.2695 0 0 -5.2695 -85.79 5100.133)"><stop offset=".05" stop-color="#07b0d3"/><stop offset=".229" stop-color="#4bb8cf"/><stop offset=".744" stop-color="#93ccb9"/><stop offset="1" stop-color="#a8d2af"/></linearGradient><path d="M533.1 834.4c-8.5-8.5-22.1-9.3-32.3-2.5-42.9 29.5-93.7 45.3-145.8 45.5-147.5 0-267.1-121.6-263.1-270.3 3.4-143.7 124.5-257.2 268.3-257.2h282.3c26.8 0 51 19.7 54.4 45.9 3.7 29.2-16.9 55.8-46.1 59.5-2.2.3-4.4.4-6.7.4H359.2c-77 0-142.9 60-145.8 136.8-2.9 80.8 62.1 148 142.5 148H639c193 0 355-152.6 358.4-345.7C1001 199.4 845.5 38 650.1 34.4c-1.7 0-3.4-.1-5.1-.1-60 0-136 14.4-204.5 65-12.3 8.2-13.6 27.2-2.9 37.8l29.3 29.3c8.5 8.5 22.1 9.3 32.3 2.5 42.9-29.5 93.7-45.3 145.8-45.5 147.5 0 267.1 121.6 263.1 269.9-3.4 143.7-124.5 257.2-268.3 257.2H357.6c-26.8 0-51-19.2-54.4-45.9-3.7-29.2 16.9-55.8 46.1-59.5 2.2-.3 4.4-.4 6.7-.4h284.8c77 0 142.9-60 145.8-136.8 2.9-80.8-62.1-148-142.5-148H360.9c-193-.3-354.5 152.4-358.4 345.4-3.6 195.4 151.9 356.8 347.3 360.4 1.7 0 3.4.1 5.1.1 60 0 136-14.4 204.5-65 12.3-8.2 13.6-27.2 2.9-37.8l-29.2-28.6z" fill="url(#a)"/></svg>',
      description: 'This tool allows the llm to return a structured output to the user.',
      type: 'tool',
      arguments: {
        schema: {
          type: 'string',
          title: 'output schema',
          description: 'the output json schema',
          format: 'textarea',
        },
      },
    };
  }

  test(configuration: StructuredOutputExtensionConfiguration): Promise<any> {
    return Promise.resolve(jsonSchemaToZod(JSON.parse(configuration.schema) as JsonSchema));
  }

  getMiddlewares(_user: User, extension: ExtensionEntity<StructuredOutputExtensionConfiguration>): Promise<ChatMiddleware[]> {
    const middleware = {
      invoke: async (context: ChatContext, _: GetContext, next: ChatNextDelegate): Promise<any> => {
        const zodSchema = jsonSchemaToZod(JSON.parse(extension.values.schema) as JsonSchema);
        context.tools.push(new InternalTool(zodSchema as z.AnyZodObject, extension.externalId));
        return next(context);
      },
    };

    return Promise.resolve([middleware]);
  }
}

class InternalTool extends StructuredTool {
  readonly name: string;
  readonly description =
    'This tool should be called in the end of a response chain when the user prompts a structured output. When calling this tool never return any other content than this to the user. The output will return a json string which should not be modified';
  readonly displayName = 'Structured Output';
  returnDirect = true;

  get lc_id() {
    return [...this.lc_namespace, this.name];
  }

  constructor(
    readonly schema: z.AnyZodObject,
    extensionExternalId: string,
  ) {
    super();

    this.name = extensionExternalId;
  }

  protected async _call(input: Record<string, any>): Promise<string> {
    return Promise.resolve(JSON.stringify(input));
  }
}
