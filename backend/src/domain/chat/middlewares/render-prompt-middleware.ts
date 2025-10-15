import { Injectable } from '@nestjs/common';
import { renderString } from 'nunjucks';
import { ChatContext, ChatMiddleware, ChatNextDelegate, GetContext } from '../interfaces';
import { ExecuteMiddleware } from './execute-middleware';

@Injectable()
export class RenderPromptMiddleware implements ChatMiddleware {
  order = ExecuteMiddleware.ORDER - 8;

  async invoke(context: ChatContext, getContext: GetContext, next: ChatNextDelegate): Promise<any> {
    const iso = new Date().toISOString();
    const data: Record<string, string> = {
      timestamp: iso,
      date: iso.split('T')[0],
      llm_name: context.llms[context.llm ?? 'unknown']?.modelName ?? 'unknown',
      llm_provider: context.llms[context.llm ?? 'unknown']?.providerName ?? 'unknown',
      user: context.user?.name ?? 'unknown',
      assistant: context.configuration?.name ?? 'unknown',
      assistant_description: context.configuration?.description ?? 'unknown',
    };

    context.systemMessages = context.systemMessages.map((msg) => {
      return renderString(msg, data);
    });

    await next(context);
  }
}
