import { Injectable, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ChatContext, ChatMiddleware, ChatNextDelegate, GetContext } from '../interfaces';
import { UpdateConversation } from '../use-cases/update-conversation';
import { ExecuteMiddleware } from './execute-middleware';

@Injectable()
export class ChooseLllMiddleware implements ChatMiddleware {
  private readonly logger = new Logger(ChooseLllMiddleware.name);

  order = ExecuteMiddleware.ORDER - 20;

  constructor(private readonly commandBus: CommandBus) {}

  async invoke(context: ChatContext, getContext: GetContext, next: ChatNextDelegate): Promise<any> {
    if (context.llm && context.llms[context.llm]) {
      await next(context);
      return;
    }

    context.llm = Object.keys(context.llms)[0];

    await next(context);

    if (!context.llm) {
      return;
    }

    try {
      await this.commandBus.execute(new UpdateConversation(context.conversationId, context.user, { llm: context.llm }));
    } catch (err) {
      this.logger.error('Failed to update conversation llm.', err);
    }
  }
}
