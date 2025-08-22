import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { onErrorResumeNextWith } from 'rxjs';
import { In } from 'typeorm';
import { ExtensionSource, MessageEntity, MessageRepository } from 'src/domain/database';
import { ConversationFileEntity, ConversationFileRepository } from '../../database/entities/conversation-file';
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
    @InjectRepository(ConversationFileEntity)
    private readonly conversationFiles: ConversationFileRepository,
  ) {}

  order?: number = GetHistoryMiddleware.ORDER;

  async invoke(context: ChatContext, getContext: GetContext, next: ChatNextDelegate): Promise<any> {
    const { conversationId, configuration } = context;

    const history = new InternalChatHistory(conversationId, configuration.id, context, this.messages, this.conversationFiles);

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

  constructor(
    private readonly conversationId: number,
    private readonly configurationId: number,
    private readonly context: ChatContext,
    private readonly messages: MessageRepository,
    private readonly conversationFiles: ConversationFileRepository,
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

  private async attachNewFilesToConversation(conversationId: number, messageId: number, files: ChatContext['files']) {
    if (!files?.length) {
      return;
    }

    const fileIds = files.map((file) => file.id);
    const existingFiles = await this.conversationFiles.find({
      where: {
        conversationId,
        fileId: In(fileIds),
      },
    });

    const existingFileIds = new Set(existingFiles.map((file) => file.fileId));
    const filesToSave = files
      .filter((file) => !existingFileIds.has(file.id))
      .map((file) => ({
        conversationId,
        messageId,
        fileId: file.id,
      }));

    const filesToUpdate = existingFiles
      .filter((file) => file.messageId == null)
      .map((file) => ({
        ...file,
        messageId,
      }));

    if (filesToUpdate.length > 0) {
      await this.conversationFiles.save(filesToUpdate);
    }

    if (filesToSave.length > 0) {
      await this.conversationFiles.save(filesToSave);
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
      tools: message.isAI() ? this.tools : [],
      // The debug information are only relevant for AI messages.
      debug: message.isAI() ? this.debug : [],
      // The sources information are only relevant for AI messages.
      sources: message.isAI() ? this.sources : [],
    };

    try {
      if (message.isAI()) {
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
        await this.attachNewFilesToConversation(entity.conversationId, entity.id, this.context.files);
        this.context.result.next({ type: 'saved', messageId: entity.id, messageType: 'human' });
      }
    } catch (err) {
      this.logger.error('Failed to store message in history.', err);
    }
  }
}

function mapStoredMessagesToChatMessages(messages: MessageEntity[]): BaseMessage[] {
  return messages.map((message) => {
    // TODO: maybe we should not save this json structure but migrate to a string column
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
