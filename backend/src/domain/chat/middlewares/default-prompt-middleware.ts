import { Injectable } from '@nestjs/common';
import { ChatContext, ChatMiddleware, ChatNextDelegate, GetContext } from '../interfaces';
import { ExecuteMiddleware } from './execute-middleware';

@Injectable()
export class DefaultPromptMiddleware implements ChatMiddleware {
  order = ExecuteMiddleware.ORDER - 10;

  async invoke(context: ChatContext, getContext: GetContext, next: ChatNextDelegate): Promise<any> {
    // Only add default prompt if custom prompt extension didn't request to replace it
    if (!context.replaceDefaultPrompt) {
      context.systemMessages.unshift(
        "You are a helpful assistant. Today's date is {{date}}. You can use Markdown notation for text and tables. You can use LaTeX notation for equations enclosed in `$` or `$$`. When returning code, json, csv or other codelike content, format it inside markdown fenced code blocks. Indicate the language on the fenced code block if at all possible.",
      );
    }
    await next(context);
  }
}
