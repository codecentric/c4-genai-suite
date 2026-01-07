import { Injectable, Logger } from '@nestjs/common';
import { stepCountIs, streamText, tool, ToolSet } from 'ai';
import * as z from 'zod';
import { I18nService } from '../../../localization/i18n.service';
import { MetricsService } from '../../../metrics/metrics.service';
import { ChatContext, ChatError, ChatMiddleware, LanguageModelContext, NamedStructuredTool } from '../interfaces';

// this is the general structure of how AI SDK wraps errors
type GenericAIError = { error: unknown };

@Injectable()
export class ExecuteMiddleware implements ChatMiddleware {
  public static ORDER = 500;
  logger = new Logger(ExecuteMiddleware.name);

  constructor(
    private readonly i18n: I18nService,
    private readonly metricsService: MetricsService,
  ) {}

  order?: number = ExecuteMiddleware.ORDER;

  async invoke(context: ChatContext) {
    const historyMessages = await context.history?.getMessages();
    if (!historyMessages?.length) {
      this.metricsService.chats.inc({ user: context.user.id });
    }

    try {
      await this.execute(context);
      this.metricsService.prompts.inc({ user: context.user.id, status: 'successful' });
    } catch (err) {
      this.metricsService.prompts.inc({ user: context.user.id, status: 'failed' });
      throw err;
    }
  }

  async handleAiSdkChainExecution(llm: LanguageModelContext, context: ChatContext) {
    const { input, systemMessages, abort, result, history, tools } = context;

    const messages = await history?.getMessages();

    const mapTool = <TSchema extends z.ZodObject<z.ZodRawShape>>(namedTool: NamedStructuredTool<any, TSchema>) => {
      return {
        name: namedTool.name,
        tool: tool({
          description: namedTool.description,
          inputSchema: namedTool.schema,
          execute: async (input: z.infer<TSchema>) => namedTool.execute(input),
        }),
      };
    };

    const allTools = tools.reduce((prev, curr) => {
      const { name, tool } = mapTool(curr);
      prev[name] = tool;
      return prev;
    }, {} as ToolSet);

    const { fullStream } = streamText({
      model: llm.model,
      tools: allTools,
      toolChoice: 'auto',
      prompt: [
        ...systemMessages.map((x) => ({ role: 'system' as const, content: x })),
        ...(messages?.filter((x) => !!x) ?? []),
        { role: 'user' as const, content: input },
      ],
      ...llm.options,
      abortSignal: abort.signal,
      stopWhen: stepCountIs(1000),
      onFinish: ({ totalUsage }) => {
        const totalTokens = totalUsage.totalTokens ?? 0;
        context.tokenUsage ??= { tokenCount: 0, model: llm.modelName, llm: llm.providerName };
        context.tokenUsage.tokenCount += totalTokens;
      },
      experimental_telemetry: {
        isEnabled: context.telemetry ?? false,
        metadata: {
          conversationId: context.conversationId,
          assistantId: context.configuration.id,
          assistantName: context.configuration.name,
          modelName: llm.modelName,
          providerName: llm.providerName,
        },
      },
    });

    let error: GenericAIError | null = null;
    const text: string[] = [];
    for await (const event of fullStream) {
      if (event.type === 'tool-call') {
        const toolName = tools.find((x) => x.name === event.toolName)?.displayName ?? event.toolName;
        result.next({ type: 'tool_start', tool: { name: toolName } });
      }
      if (event.type === 'tool-result') {
        const toolName = tools.find((x) => x.name === event.toolName)?.displayName ?? event.toolName;
        result.next({ type: 'tool_end', tool: { name: toolName } });
      }
      if (event.type === 'tool-error') {
        this.logger.error({ event });
        const toolName = tools.find((x) => x.name === event.toolName)?.displayName ?? event.toolName;
        // TODO: maybe add a `tool_error` event type and indicate errors in the ui
        result.next({ type: 'tool_end', tool: { name: toolName } });
      }
      if (event.type === 'reasoning-delta') {
        result.next({ type: 'reasoning', content: event.text });
      }
      if (event.type === 'reasoning-end') {
        result.next({ type: 'reasoning_end' });
      }
      if (event.type === 'text-delta') {
        text.push(event.text);
        result.next({ type: 'chunk', content: [{ type: 'text', text: event.text }] });
      }
      if (event.type === 'error') {
        this.logger.error({ event });
        error = event.error as GenericAIError;
      }
      if (event.type === 'finish') {
        if (event.finishReason === 'content-filter') {
          error = { error: { code: 'content_filter' } };
        }
      }
    }

    await history?.addAIMessage(text.join(''));

    if (error) {
      // unwrap and throw the causing error to be handled by the ExceptionMiddleware
      throw error.error;
    }
  }

  async execute(context: ChatContext) {
    const { llm: chosenLlm, configuration, llms } = context;

    if (configuration.executorEndpoint) {
      return;
    }

    const llm = llms[chosenLlm ?? ''];

    if (!llm) {
      throw new ChatError(this.i18n.t('texts.chat.errorMissingLLM'));
    }

    return this.handleAiSdkChainExecution(llm, context);
  }
}
