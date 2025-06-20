import { MessageContent } from '@langchain/core/messages';
import { ChatGenerationChunk } from '@langchain/core/outputs';
import { Runnable, RunnableWithMessageHistory } from '@langchain/core/runnables';
import { StructuredToolInterface } from '@langchain/core/tools';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AgentExecutor, AgentExecutorInput, createOpenAIToolsAgent } from 'langchain/agents';
import { I18nService } from '../../../localization/i18n.service';
import { MetricsService } from '../../../metrics/metrics.service';
import { ChatContext, ChatError, ChatMiddleware, NormalizedMessageContents } from '../interfaces';
import { normalizedMessageContent } from '../utils';

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

  async execute(context: ChatContext) {
    const { llm: chosenLlm, agentFactory, configuration, llms, input, result, prompt, tools, history } = context;

    const shouldLogLLMAgent = this.configService.get<string>('LOG_LLM_AGENT', 'false');
    if (configuration.executorEndpoint) {
      return;
    }

    const llm = llms[chosenLlm ?? ''];

    if (!llm) {
      throw new ChatError(this.i18n.t('texts.chat.errorMissingLLM'));
    }

    if (!prompt) {
      throw new ChatError(this.i18n.t('texts.chat.errorMissingPrompt'));
    }

    let runnable: Runnable;

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

    for await (const event of stream) {
      const eventType = event.event as EventType;

      if (eventType === 'on_llm_start') {
        hasBeenStarted = true;
      } else if (hasBeenStarted && eventType === 'on_llm_stream' && !hasChainStream) {
        hasLlmStream = true;
        const chunk = event.data?.chunk as ChatGenerationChunk;
        const content = normalizedMessageContent(chunk);

        // Content can either be a string or an array of objects.
        if (content.length > 0) {
          result.next({ type: 'chunk', content });
          hasBeenStreamed = true;
        }
      } else if (hasBeenStarted && eventType === 'on_chain_stream' && !hasLlmStream) {
        hasChainStream = true;
        const chunk = event.data?.chunk as ChatGenerationChunk;
        const content = normalizedMessageContent(chunk);

        // Content can either be a string or an array of objects.
        if (content.length > 0) {
          result.next({ type: 'chunk', content });
          hasBeenStreamed = true;
        }
      } else if (eventType === 'on_chain_end' && !!event.data.output) {
        const output = event.data.output as MessageContent;
        const result = normalizedMessageContent(output);

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
