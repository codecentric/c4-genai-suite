import { Injectable, Logger } from '@nestjs/common';
import { stepCountIs, streamText, tool, ToolSet } from 'ai';
import { I18nService } from '../../../localization/i18n.service';
import { MetricsService } from '../../../metrics/metrics.service';
import { BaseMessage, ChatContext, ChatError, ChatMiddleware, LanguageModelContext, NamedStructuredTool } from '../interfaces';

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

    const mapTool = (namedTool: NamedStructuredTool) => {
      return {
        name: namedTool.name,
        tool: tool({
          name: namedTool.name,
          inputSchema: namedTool.schema,
          execute: (input) => namedTool.execute(input),
          description: namedTool.description,
        }),
      };
    };

    const allTools = tools.reduce((prev, curr) => {
      const { name, tool } = mapTool(curr);
      prev[name] = tool;
      return prev;
    }, {} as ToolSet);

    const mapBaseMessage = (message: BaseMessage) => {
      const text = message.content;

      const type = message.getType();
      switch (type) {
        case 'human':
          return { role: 'user' as const, content: text };
        case 'ai':
          return { role: 'assistant' as const, content: text };
      }
    };

    const { fullStream, text, usage } = streamText({
      model: llm.model,
      tools: allTools,
      toolChoice: 'auto',
      prompt: [
        ...systemMessages.map((x) => ({ role: 'system' as const, content: x })),
        ...(messages?.map((x) => mapBaseMessage(x)).filter((x) => !!x) ?? []),
        { role: 'user' as const, content: input },
      ],
      ...llm.options,
      abortSignal: abort.signal,
      stopWhen: stepCountIs(1000),
    });

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
        result.next({ type: 'tool_end', tool: { name: toolName } });
      }
      if (event.type === 'reasoning-delta') {
        result.next({ type: 'reasoning', content: event.text });
      }
      if (event.type === 'reasoning-end') {
        result.next({ type: 'reasoning_end' });
      }
      if (event.type === 'text-delta') {
        result.next({ type: 'chunk', content: [{ type: 'text', text: event.text }] });
      }
      if (event.type === 'error') {
        this.logger.error({ event });
      }
    }

    await history?.addAIMessage(await text);

    // TODO: we might want to implement a token estimation, since some models do not provide `usage`.
    const totalTokens = (await usage).totalTokens ?? 0;
    context.tokenUsage ??= { tokenCount: 0, model: llm.modelName, llm: llm.providerName };
    context.tokenUsage.tokenCount += totalTokens;
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
