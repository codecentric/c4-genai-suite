import { BaseListChatMessageHistory } from '@langchain/core/chat_history';
import {
  AIMessage,
  AIMessageChunk,
  BaseMessage,
  HumanMessage,
  mapChatMessagesToStoredMessages,
  mapStoredMessagesToChatMessages,
} from '@langchain/core/messages';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { onErrorResumeNextWith } from 'rxjs';
import { ExtensionSource, MessageEntity, MessageRepository } from 'src/domain/database';
import { is } from 'src/lib';
import { ChatContext, ChatMiddleware, ChatNextDelegate, GetContext, MessagesHistory, Source } from '../interfaces';

@Injectable()
export class GetHistoryMiddleware implements ChatMiddleware {
  public static ORDER = -100;

  constructor(
    @InjectRepository(MessageEntity)
    private readonly messages: MessageRepository,
  ) {}

  order?: number = GetHistoryMiddleware.ORDER;

  async invoke(context: ChatContext, getContext: GetContext, next: ChatNextDelegate): Promise<any> {
    const { conversationId } = context;

    const history = new InternalChatHistory(conversationId, context, this.messages);

    await history.addMessage(
      new HumanMessage({
        content: context.input,
      }),
      true,
      context.editMessageId,
    );

    context.history = history;
    await next(context);
  }
}

class InternalChatHistory extends BaseListChatMessageHistory implements MessagesHistory {
  private readonly logger = new Logger(InternalChatHistory.name);
  private readonly tools: string[] = [];
  private readonly debug: string[] = [];
  private sources: ExtensionSource[] = [];
  private stored?: BaseMessage[];
  private currentParentId?: number;

  lc_namespace!: string[];

  constructor(
    private readonly conversationId: number,
    private readonly context: ChatContext,
    private readonly messages: MessageRepository,
  ) {
    super();

    // Just ignore the error. Otherwise it is treated as unhandled.
    context.result.pipe(onErrorResumeNextWith()).subscribe((event) => {
      if (event.type === 'tool_start') {
        this.tools.push(event.tool.name);
      } else if (event.type === 'debug') {
        this.debug.push(event.content);
      }
    });
  }

  addSources(extensionExternalId: string, sources: Source[]): void {
    this.sources.push(
      ...sources.map((source) => ({
        ...source,
        extensionExternalId,
      })),
    );
  }

  getMessages(): Promise<BaseMessage[]> {
    if (this.conversationId <= 0) {
      return Promise.resolve([]);
    }

    return Promise.resolve(this.stored ?? []);
  }

  private publishSourcesReferences() {
    if (this.sources.length > 0) {
      this.context.result.next({
        type: 'sources',
        content: this.sources.map((source) => ({
          ...source,
          chunk: {
            ...source.chunk,
            content: '',
          },
        })),
      });
    }
  }

  async addMessage(message: BaseMessage, persistHuman?: boolean, editMessageId?: number): Promise<void> {
    const data = mapChatMessagesToStoredMessages([message]).map(({ type, data }) => ({
      type,
      conversation: {
        id: this.conversationId,
      },
      data,
      // The tools is used for the UI only to display the used tools for old conversations.
      tools: isAIMessage(message) ? this.tools : [],
      // The debug information are only relevant for AI messages.
      debug: isAIMessage(message) ? this.debug : [],
      // The sources information are only relevant for AI messages.
      sources: isAIMessage(message) ? this.sources : [],
    }));

    try {
      if (isAIMessage(message)) {
        this.publishSourcesReferences();
        const entity = await this.messages.save({
          ...data[0],
          parentId: this.currentParentId,
        });
        this.currentParentId = entity.id;
        // Notifo the UI about the message ID, because it is needed to rate messages.
        this.context.result.next({ type: 'saved', messageId: entity.id, messageType: 'ai' });
      } else if (persistHuman) {
        if (editMessageId) {
          const message = await this.messages.findOneBy({ id: editMessageId });
          this.currentParentId = message?.parentId;
        } else {
          // we actually need a replyToMessageId
          const message = await this.messages.findOne({
            where: {
              conversationId: this.conversationId,
            },
            order: {
              id: 'DESC',
            },
          });
          this.currentParentId = message?.id;
        }

        this.stored = mapStoredMessagesToChatMessages(
          await this.messages.getMessageThread(this.conversationId, this.currentParentId),
        );
        const entity = await this.messages.save({ parentId: this.currentParentId, ...data[0] });
        this.currentParentId = entity.id;
        this.context.result.next({ type: 'saved', messageId: entity.id, messageType: 'human' });
      }
    } catch (err) {
      this.logger.error('Failed to store message in history.', err);
    }
  }
}

function isAIMessage(message: BaseMessage) {
  // For whatever reason there are two kind of messages for that.
  return is(message, AIMessage) || is(message, AIMessageChunk);
}
