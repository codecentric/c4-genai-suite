import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { BaseMessage, MessageContent } from '@langchain/core/messages';
import { ChatGenerationChunk } from '@langchain/core/outputs';
import { Runnable, RunnableWithMessageHistory } from '@langchain/core/runnables';
import { StructuredToolInterface } from '@langchain/core/tools';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { stepCountIs, streamText, tool, ToolSet } from 'ai';
import { AgentExecutor, AgentExecutorInput, createOpenAIToolsAgent } from 'langchain/agents';
import * as z from 'zod';
import { I18nService } from '../../../localization/i18n.service';
import { MetricsService } from '../../../metrics/metrics.service';
import {
  ChatContext,
  ChatError,
  ChatMiddleware,
  isLanguageModelContext,
  LanguageModelContext,
  NormalizedMessageContents,
} from '../interfaces';
import { getReasoningContent, normalizedMessageContent } from '../utils';

type EventActionType = 'start' | 'stream' | 'end';
type EventContextType = 'llm' | 'chat_model' | 'prompt' | 'tool' | 'chain';
type EventType = `on_${EventContextType}_${EventActionType}`;

@Injectable()
export class ExecuteMiddleware implements ChatMiddleware {
  public static ORDER = 500;
  logger = new Logger(ExecuteMiddleware.name);

  constructor(
    private readonly configService: ConfigService,
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

    const mapTool = (langchainTool: StructuredToolInterface & { _call?: (input: unknown) => Promise<unknown> }) => {
      return {
        name: langchainTool.name,
        tool: tool({
          name: langchainTool.name,
          inputSchema: langchainTool.schema as z.Schema<z.ZodTypeAny>,
          execute: (input) => langchainTool._call?.(input) ?? '',
          description: langchainTool.description,
        }),
      };
    };

    const allTools = tools.reduce((prev, curr) => {
      const { name, tool } = mapTool(curr);
      prev[name] = tool;
      return prev;
    }, {} as ToolSet);

    const mapBaseMessage = (message: BaseMessage) => {
      const normalized = normalizedMessageContent(message.content)?.[0];
      const text = normalized?.type === 'text' ? normalized.text : '';

      const type = message.getType();
      switch (type) {
        case 'human':
          return { role: 'user' as const, content: text };
        case 'system':
          return { role: 'system' as const, content: text };
        case 'ai':
          return { role: 'assistant' as const, content: text };
      }
    };

    const { fullStream, text } = streamText({
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
        console.log({ event });
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
    }

    await history?.addAIMessage(await text);
  }

  async handleLangChainExecution(llm: BaseChatModel, context: ChatContext) {
    const shouldLogLLMAgent = this.configService.get<string>('LOG_LLM_AGENT', 'false');
    const { agentFactory, input, result, prompt, tools, history } = context;
    let runnable: Runnable;

    if (!prompt) {
      throw new ChatError(this.i18n.t('texts.chat.errorMissingPrompt'));
    }

    if (tools.length > 0) {
      const agent = await (agentFactory ?? createOpenAIToolsAgent)({
        llm,
        tools,
        prompt,
      });

      runnable = new HackingAgentExecutor({
        agent,
        tools,
        verbose: shouldLogLLMAgent === 'true',
      });
    } else {
      runnable = prompt.pipe(llm);
    }

    // This class is not properly documented in langchain but it works after a lot of testing.
    const agentWithChatHistory = history
      ? new RunnableWithMessageHistory({
          runnable,
          // We don't need the session ID because we create the agent per call.
          getMessageHistory: () => history,
          // Uses the key to calculate the diff between all messages and input messages.
          inputMessagesKey: 'input',
          // Used to inject the history into the prompt.
          historyMessagesKey: 'chat_history',
        })
      : runnable;

    const stream = agentWithChatHistory.streamEvents(
      {
        input,
      },
      {
        version: 'v1',
        configurable: {
          sessionId: context.conversationId.toString(),
        },
        callbacks: context.callbacks,
      },
    );

    // Stores the last result in case streaming is not supported.
    let lastResult: NormalizedMessageContents | undefined;
    let hasBeenStreamed = false;
    let hasBeenStarted = false;
    let hasLlmStream = false;
    let hasChainStream = false;

    const getToolName = (toolId: string) => tools.find((x) => x.name === toolId)?.displayName || toolId;

    let isReasoning = false;
    const handleReasoning = (chunk: ChatGenerationChunk | MessageContent) => {
      const reasoningContent = getReasoningContent(chunk);
      if (reasoningContent?.length) {
        isReasoning = true;
        result.next({ type: 'reasoning', content: reasoningContent });
      } else if (isReasoning) {
        isReasoning = false;
        result.next({ type: 'reasoning_end' });
      }
    };

    for await (const event of stream) {
      const eventType = event.event as EventType;

      if (eventType === 'on_llm_start') {
        hasBeenStarted = true;
      } else if (hasBeenStarted && eventType === 'on_llm_stream' && !hasChainStream) {
        hasLlmStream = true;
        const chunk = event.data?.chunk as ChatGenerationChunk;
        const content = normalizedMessageContent(chunk);
        handleReasoning(chunk);

        // Content can either be a string or an array of objects.
        if (content.length > 0) {
          result.next({ type: 'chunk', content });
          hasBeenStreamed = true;
        }
      } else if (hasBeenStarted && eventType === 'on_chain_stream' && !hasLlmStream) {
        hasChainStream = true;
        const chunk = event.data?.chunk as ChatGenerationChunk;
        const content = normalizedMessageContent(chunk);
        handleReasoning(chunk);

        // Content can either be a string or an array of objects.
        if (content.length > 0) {
          result.next({ type: 'chunk', content });
          hasBeenStreamed = true;
        }
      } else if (eventType === 'on_chain_end' && !!event.data.output) {
        const output = event.data.output as MessageContent;
        const result = normalizedMessageContent(output);
        handleReasoning(result);

        if (result.length > 0) {
          lastResult = result;
        }
      } else if (eventType === 'on_tool_start') {
        const toolName = getToolName(event.name);
        result.next({ type: 'tool_start', tool: { name: toolName } });
      } else if (eventType === 'on_tool_end') {
        if (this.configService.get<string>('LOG_RAG_CHUNKS', 'false') === 'true') {
          try {
            const chunks = JSON.parse(event.data.output as string) as { content: string; metadata: Record<string, any> }[];
            this.logger.log('==============RAG DEBUG==============');
            this.logger.log('Query: ' + event.data.input);
            this.logger.log('Num of chunks ' + chunks.length);
            chunks.forEach((chunk: { content: string; metadata: Record<string, any> }) => {
              this.logger.log(JSON.stringify(chunk, null, 2));
              this.logger.log('-----------------------------');
            });
            this.logger.log('=====================================');

            result.next({ type: 'logging', content: createLoggingChunks(chunks) });
          } catch (ex) {
            this.logger.error('Log for RAG Chunks failed\n Cause: ', ex);
          }
        }

        result.next({ type: 'tool_end', tool: { name: getToolName(event.name) } });
      }
    }

    if (!hasBeenStreamed && lastResult && lastResult.length > 0) {
      // If the llm does not support streaming we have a fallback.
      result.next({ type: 'chunk', content: lastResult });
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

    if (isLanguageModelContext(llm)) {
      return this.handleAiSdkChainExecution(llm, context);
    }

    return this.handleLangChainExecution(llm, context);
  }
}

type ToolWithFallback = StructuredToolInterface & { returnDirectFallback: boolean };

class HackingAgentExecutor extends AgentExecutor {
  constructor(input: AgentExecutorInput) {
    for (const tool of input.tools) {
      (tool as ToolWithFallback)['returnDirectFallback'] = tool.returnDirect;
      tool.returnDirect = false;
    }

    super(input);

    for (const tool of input.tools) {
      tool.returnDirect = (tool as ToolWithFallback)['returnDirectFallback'];
    }
  }
}

function createLoggingChunks(chunks: { content: string }[]) {
  let logging = '**LOGGING**\n\n***Number of chunks*** ' + chunks.length + '\n\n';
  chunks.forEach((chunk, index) => {
    logging += '***Chunk nr. ' + (index + 1) + ':***\n\n';
    logging += chunk.content + '\n\n';
  });
  return logging;
}
