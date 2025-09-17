import { AsyncLocalStorage } from 'async_hooks';
import { forwardRef, Inject, NotFoundException } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import { Observable, ReplaySubject } from 'rxjs';
import { GetExtensions, GetExtensionsResponse } from 'src/domain/extensions';
import { GetConfiguration, GetConfigurationResponse } from 'src/domain/extensions/use-cases';
import { User } from 'src/domain/users/interfaces';
import { I18nService } from '../../../localization/i18n.service';
import {
  GetConfigurationUserValues,
  GetConfigurationUserValuesResponse,
} from '../../extensions/use-cases/get-configuration-user-values';
import { UploadedFile } from '../../files';
import { ChatCacheImpl } from '../cache';
import {
  CHAT_MIDDLEWARES_TOKEN,
  ChatContext,
  ChatMiddleware,
  ChatNextDelegate,
  Conversation,
  GetContext,
  StreamEvent,
} from '../interfaces';
import { GetConversation, GetConversationResponse } from './get-conversation';

export class SendMessage {
  constructor(
    public readonly conversationId: number,
    public readonly user: User,
    public readonly input: string,
    public readonly files?: Pick<UploadedFile, 'id' | 'fileName'>[],
    public readonly editMessageId?: number,
  ) {}
}

export class SendMessageResponse {
  constructor(public readonly stream: Observable<StreamEvent>) {}
}

@QueryHandler(SendMessage)
export class SendMessageHandler implements IQueryHandler<SendMessage, SendMessageResponse> {
  private readonly logger = new Logger(SendMessageHandler.name);
  private readonly store = new AsyncLocalStorage();

  constructor(
    @Inject(forwardRef(() => QueryBus))
    private readonly queryBus: QueryBus,
    @Inject(CHAT_MIDDLEWARES_TOKEN)
    private readonly middlewares: ChatMiddleware[],
    private readonly i18n: I18nService,
    private readonly cache: ChatCacheImpl,
  ) {}

  async execute(query: SendMessage): Promise<SendMessageResponse> {
    const { conversationId, input, user, files, editMessageId } = query;

    // Get the conversation here, because we need the extension configuration.
    const { conversation }: GetConversationResponse = await this.queryBus.execute(new GetConversation(conversationId, user));

    if (!conversation) {
      throw new NotFoundException(`Conversation with id '${conversationId}' not found`);
    }

    // The configuration is needed for the executor settings.
    const { configuration }: GetConfigurationResponse = await this.queryBus.execute(
      new GetConfiguration(conversation.configurationId),
    );

    if (!configuration) {
      throw new NotFoundException(`Configuration with id '${conversation.configurationId}' not found`);
    }

    const observable = new Observable<StreamEvent>((observer) => {
      const context: ChatContext = {
        abort: new AbortController(),
        cache: this.cache,
        context: conversation.context || {},
        conversationId: conversation.id,
        configuration: configuration,
        input,
        editMessageId,
        files,
        llm: conversation.llm,
        llms: {},
        result: new ReplaySubject(),
        systemMessages: [],
        tools: [],
        ui: undefined!,
        user,
      };

      context.result.subscribe(observer);

      const run = async () => {
        this.store.enterWith(context);

        // Provides access to the context, event if it cannot be accessed directly through parameters.
        const getContext = () => this.store.getStore() as ChatContext;

        try {
          const next = await this.buildPipeline(context, conversation, getContext);
          await next(context);
        } catch (err) {
          if (err instanceof Error) {
            this.logger.error(`Error occurred while sending message: ${err.message}`, err.stack);
          } else {
            this.logger.error(`Unknown error occurred while sending message: ${JSON.stringify(err)}`);
          }
          context.result.error({ type: 'error', message: this.i18n.t('texts.chat.errorInternal') });
        } finally {
          context.result.complete();
          this.cache.clean();
          this.store.disable();
        }
      };

      void run();

      return () => {
        context.abort.abort();
      };
    });

    return new SendMessageResponse(observable);
  }

  private async buildPipeline(context: ChatContext, conversation: Conversation, getContext: GetContext) {
    const middlewares = [...this.middlewares];

    const { extensions }: GetExtensionsResponse = await this.queryBus.execute(
      new GetExtensions(context.configuration.id, false, false),
    );

    const { configuration: configurationUser }: GetConfigurationUserValuesResponse = await this.queryBus.execute(
      new GetConfigurationUserValues(context.configuration.id, context.user.id),
    );

    for (const extension of extensions) {
      const extensionMiddlewares = await extension.getMiddlewares(
        context.user,
        conversation.extensionUserArguments?.[extension.id],
        configurationUser?.values?.[extension.id] ?? {},
      );

      for (const middleware of extensionMiddlewares) {
        middlewares.push(middleware);
      }
    }

    middlewares.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    let next: ChatNextDelegate = () => Promise.resolve(true);

    for (const middleware of middlewares.reverse()) {
      const currentNext = next;

      next = (context) => middleware.invoke(context, getContext, currentNext);
    }

    return next;
  }
}
