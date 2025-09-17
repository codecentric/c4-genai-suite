import { forwardRef, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { streamText } from 'ai';
import { I18nService } from '../../../localization/i18n.service';
import { ChatContext, ChatMiddleware, ChatNextDelegate, GetContext } from '../interfaces';
import { GetConversation, GetConversationResponse } from '../use-cases';
import { UpdateConversation } from '../use-cases';
import { normalizedMessageContent } from '../utils';
import { ExecuteMiddleware } from './execute-middleware';

@Injectable()
export class SummarizeHistoryMiddleware implements ChatMiddleware {
  order?: number = ExecuteMiddleware.ORDER - 1;

  private readonly logger = new Logger(SummarizeHistoryMiddleware.name);

  constructor(
    private readonly commandBus: CommandBus,
    @Inject(forwardRef(() => QueryBus))
    private readonly queryBus: QueryBus,
    private readonly i18n: I18nService,
  ) {}

  private async getUserMessages(context: ChatContext) {
    const messages = (await context.history?.getMessages()) ?? [];

    const allUserMessages = messages
      .reverse()
      .filter((message) => message.getType() === 'human')
      .flatMap((humanMessage) =>
        normalizedMessageContent(humanMessage.content)
          .filter((item) => item.type === 'text')
          .map((item) => item.text),
      );

    const maxUserMessages = (context.summaryConfig?.historyLength ?? 5) - 1;
    const userMessages = allUserMessages.slice(0, maxUserMessages);
    userMessages.unshift(context.input);
    return userMessages;
  }

  private async getConversationName(context: ChatContext) {
    if (!context.llm) {
      return null;
    }

    const llm = context.llms[context.llm];
    if (!llm) {
      return null;
    }

    const userMessages = await this.getUserMessages(context);

    const historyPrompt =
      context.summaryConfig?.prompt ??
      "Summarize the following content ALWAYS in the same language as the content as short as possible in not more than 3 words. Write it as if it is Headline of an Article. Dont't use new lines!";

    const { text } = streamText({
      model: llm.model,
      prompt: [
        { role: 'system' as const, content: historyPrompt },
        { role: 'user' as const, content: userMessages.join(' ') },
      ],
      ...llm.options,
    });

    try {
      const name = await text;
      return name ?? this.i18n.t('texts.chat.noSummary');
    } catch (err) {
      this.logger.error('Failed to get conversation summary.', err);
    }

    return this.i18n.t('texts.chat.noSummary');
  }

  private async updateConversationName(context: ChatContext) {
    const { conversation }: GetConversationResponse = await this.queryBus.execute(
      new GetConversation(context.conversationId, context.user),
    );

    if (!conversation) {
      throw new NotFoundException(`Conversation with id '${context.conversationId}' was not found`);
    }

    if (!conversation.isNameSetManually) {
      try {
        const conversationName = await this.getConversationName(context);
        if (conversationName) {
          await this.commandBus.execute(
            new UpdateConversation(context.conversationId, context.user, { name: conversationName, isNameSetManually: false }),
          );
          context.result.next({
            type: 'summary',
            content: conversationName,
          });
        }
      } catch (err) {
        this.logger.error('Failed to update conversation summary.', err);
      }
    }
  }

  async invoke(context: ChatContext, _: GetContext, next: ChatNextDelegate): Promise<any> {
    const update = this.updateConversationName(context);
    await next(context);
    await update;
  }
}
