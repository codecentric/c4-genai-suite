import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { onErrorResumeNextWith } from 'rxjs';
import { ExtensionSource, MessageEntity, MessageRepository } from 'src/domain/database';
import {
  AIMessage,
  BaseMessage,
  ChatContext,
  ChatMiddleware,
  ChatNextDelegate,
  GetContext,
  HumanMessage,
  MessagesHistory,
  Source,
} from '../interfaces';

@Injectable()
export class GetHistoryMiddleware implements ChatMiddleware {
  public static ORDER = -100;

  constructor(
    @InjectRepository(MessageEntity)
    private readonly messages: MessageRepository,
  ) {}

  order?: number = GetHistoryMiddleware.ORDER;

  async invoke(context: ChatContext, getContext: GetContext, next: ChatNextDelegate): Promise<any> {
    const { conversationId, configuration } = context;

    const history = new InternalChatHistory(conversationId, configuration.id, context, this.messages);

    await history.addMessage(new HumanMessage(context.input), true, context.editMessageId);

    context.history = history;
    await next(context);
  }
}

class InternalChatHistory extends MessagesHistory {
  private readonly logger = new Logger(InternalChatHistory.name);
  private readonly tools: string[] = [];
  private readonly debug: string[] = [];
  private sources: ExtensionSource[] = [];
  private stored?: BaseMessage[];
  private currentParentId?: number;

  lc_namespace!: string[];

  constructor(
    private readonly conversationId: number,
    private readonly configurationId: number,
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
    const data = {
      type: message.getType(),
      data: {
        content: message.content,
      },
      conversation: {
        id: this.conversationId,
      },
      // The tools is used for the UI only to display the used tools for old conversations.
      tools: isAIMessage(message) ? this.tools : [],
      // The debug information are only relevant for AI messages.
      debug: isAIMessage(message) ? this.debug : [],
      // The sources information are only relevant for AI messages.
      sources: isAIMessage(message) ? this.sources : [],
    };

    try {
      if (isAIMessage(message)) {
        this.publishSourcesReferences();
        const entity = await this.messages.save({
          ...data,
          parentId: this.currentParentId,
          configurationId: this.configurationId,
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
          await this.messages.getMessageThread(this.conversationId, this.currentParentId, false),
        );

        const entity = await this.messages.save({
          parentId: this.currentParentId,
          configurationId: this.configurationId,
          ...data,
        });
        this.currentParentId = entity.id;
        this.context.result.next({ type: 'saved', messageId: entity.id, messageType: 'human' });
      }
    } catch (err) {
      this.logger.error('Failed to store message in history.', err);
    }
  }
}

function mapStoredMessagesToChatMessages(messages: MessageEntity[]): BaseMessage[] {
  return messages.map((message) => {
    // TODO: maybe we should not svae this json structure but migrate to a string column
    const data = message.data as { content: string };
    const text = data.content;

    switch (message.type) {
      case 'human':
        return new HumanMessage(text);
      case 'ai':
        return new AIMessage(text);
      default:
        throw new Error(`Unsupported message type '${message.type}'.`);
    }
  });
}

function isAIMessage(message: BaseMessage) {
  // For whatever reason there are two kind of messages for that.
  return message.getType() === 'ai';
}
