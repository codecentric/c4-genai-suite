import { Injectable, Logger } from '@nestjs/common';
import { generateText, stepCountIs, streamText, tool, ToolSet } from 'ai';
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

  private buildToolSet(tools: NamedStructuredTool[]): ToolSet {
    return tools.reduce((prev, curr) => {
      prev[curr.name] = tool({
        description: curr.description,
        inputSchema: curr.schema,
        execute: async (input) => curr.execute(input),
      });
      return prev;
    }, {} as ToolSet);
  }

  async handleAiSdkChainExecution(llm: LanguageModelContext, context: ChatContext) {
    if (llm.disableStreaming) {
      return this.handleAiSdkNonStreamingExecution(llm, context);
    }
    return this.handleAiSdkStreamingExecution(llm, context);
  }

  private async handleAiSdkStreamingExecution(llm: LanguageModelContext, context: ChatContext) {
    const { input, systemMessages, abort, result, history, tools } = context;

    const messages = await history?.getMessages();
    const allTools = this.buildToolSet(tools);

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

  private async handleAiSdkNonStreamingExecution(llm: LanguageModelContext, context: ChatContext) {
    const { input, systemMessages, abort, result, history, tools } = context;

    const messages = await history?.getMessages();
    const allTools = this.buildToolSet(tools);

    const response = await generateText({
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

    const totalTokens = response.usage?.totalTokens ?? 0;
    context.tokenUsage ??= { tokenCount: 0, model: llm.modelName, llm: llm.providerName };
    context.tokenUsage.tokenCount += totalTokens;

    if (response.finishReason === 'content-filter') {
      throw { code: 'content_filter' } as unknown;
    }

    // Emit tool events for each step
    for (const step of response.steps) {
      for (const toolCall of step.toolCalls) {
        const toolName = tools.find((x) => x.name === toolCall.toolName)?.displayName ?? toolCall.toolName;
        result.next({ type: 'tool_start', tool: { name: toolName } });
        result.next({ type: 'tool_end', tool: { name: toolName } });
      }
    }

    // Emit reasoning if present
    if (response.reasoningText) {
      result.next({ type: 'reasoning', content: response.reasoningText });
      result.next({ type: 'reasoning_end' });
    }

    // Emit the complete text as a single chunk
    if (response.text) {
      result.next({ type: 'chunk', content: [{ type: 'text', text: response.text }] });
    }

    await history?.addAIMessage(response.text ?? '');
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
