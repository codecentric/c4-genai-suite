import * as https from 'https';
import { mapChatMessagesToStoredMessages } from '@langchain/core/messages';
import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { isString } from 'class-validator';
import { default as nodeFetch, RequestInfo, RequestInit } from 'node-fetch';
import { ConfigurationModel } from 'src/domain/extensions';
import { User } from 'src/domain/users';
import { InternalError } from 'src/lib';
import { ChatContext, ChatMiddleware, ChatNextDelegate, GetContext } from '../interfaces';
import { UpdateConversation } from '../use-cases';
import { ExecuteMiddleware } from './execute-middleware';
import { AnswerRequestDto, AnswerResponseDto, ChatApi, Configuration, HTTPHeaders } from './generated';

// HISTORY
// ..
// Executor
// Execute // DEFAULT

@Injectable()
export class ExecutorMiddleware implements ChatMiddleware {
  order?: number = ExecuteMiddleware.ORDER - 1;

  constructor(private readonly commandBus: CommandBus) {}

  async invoke(context: ChatContext, getContext: GetContext, next: ChatNextDelegate): Promise<any> {
    const { configuration, input, user, history } = context;

    if (!configuration.executorEndpoint) {
      await next(context);
      return;
    }

    const api = buildClient(configuration);

    const request = await this.buildRequest(user, input, context);
    const response = await api.answer(request);

    if (history) {
      await history.addUserMessage(input);
    }

    await this.processResponse(response, context);
  }

  private async buildRequest(user: User, input: string, context: ChatContext) {
    const messages = (await context.history?.getMessages()) ?? [];

    const { id, name, email } = user;
    const request: AnswerRequestDto = {
      history: [],
      prompt: input,
      user: {
        id,
        name,
        email,
        roles: [],
      },
      context: context.context,
    };

    const stored = mapChatMessagesToStoredMessages(messages);

    for (const message of context.systemMessages) {
      request.history.push({ content: message, type: 'ai' });
    }

    for (const message of stored) {
      if (!isString(message.data.content)) {
        throw new InternalError('Only string messages are supported.');
      }

      // FIXME: find out if 'system' should be part of `MessageType` or if the check below
      //  can omit `messageType === 'system'`
      //  Then change to:
      // const type = message.type as MessageType;
      const messageType = message.type;
      if (messageType === 'human' || messageType === 'system' || messageType === 'ai') {
        request.history.push({ content: message.data.content, type: 'ai' });
      }
    }

    return request;
  }

  private async processResponse(response: AnswerResponseDto, context: ChatContext) {
    const { history, result } = context;

    if (response.debug) {
      result.next({ type: 'debug', content: response.debug });
    }

    if (response.summary) {
      await this.commandBus.execute(new UpdateConversation(context.conversationId, context.user, { name: response.summary }));
    }

    if (response.result) {
      if (history) {
        await history.addAIMessage(response.result.content);
      }

      result.next({ type: 'chunk', content: [{ type: 'text', text: response.result.content }] });
    }
  }
}

function buildClient(configuration: ConfigurationModel) {
  const headers: HTTPHeaders = {};

  if (configuration.executorHeaders) {
    for (const pair of configuration.executorHeaders.split(/[,;\n]/)) {
      const [key, value] = pair.trim().split('=');

      if (key && value) {
        headers[key.trim()] = value.trim();
      }
    }
  }

  const api = new ChatApi(
    new Configuration({
      headers,
      fetchApi: async (request, init) => {
        const agent = new https.Agent({
          // Certificate validation is enabled by default
        });

        // This method is only called from the generated API-Clients with hardcoded
        // paths, so there should be no risk of SSRF
        // nosemgrep: nodejs_scan.javascript-ssrf-rule-node_ssrf
        const result = await nodeFetch(request as RequestInfo, { ...init, agent } as RequestInit);

        return result as unknown as Response;
      },
      basePath: configuration.executorEndpoint,
    }),
  );

  return api;
}
