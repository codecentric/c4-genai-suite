import { Injectable } from '@nestjs/common';
import { ChatContext, ChatMiddleware, ChatNextDelegate, GetContext } from '../interfaces';
import { ExecuteMiddleware } from './execute-middleware';

@Injectable()
export class DefaultPromptMiddleware implements ChatMiddleware {
  order = ExecuteMiddleware.ORDER - 10;

  async invoke(context: ChatContext, getContext: GetContext, next: ChatNextDelegate): Promise<any> {
    if (context.systemMessages.length === 0) {
      context.systemMessages.push(`You are a helpful assistant. Today is ${new Date().toISOString()}.`);
    }
    await next(context);
  }
}
