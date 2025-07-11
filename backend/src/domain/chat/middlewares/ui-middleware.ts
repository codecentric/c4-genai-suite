import { Injectable } from '@nestjs/common';
import { ExtensionArgument } from '../../extensions';
import { ChatContext, ChatMiddleware, ChatNextDelegate, ChatUI, GetContext } from '../interfaces';
import { CallbackService } from '../services/callback-service';

@Injectable()
export class UIMiddleware implements ChatMiddleware {
  order = -1000;

  constructor(private readonly callbacks: CallbackService) {}

  invoke(context: ChatContext, getContext: GetContext, next: ChatNextDelegate): Promise<any> {
    context.ui = new ChatUIImpl(context, this.callbacks);
    return next(context);
  }
}

class ChatUIImpl implements ChatUI {
  constructor(
    private readonly context: ChatContext,
    private readonly callbacks: CallbackService,
  ) {}

  form(text: string, schema: ExtensionArgument) {
    const { id, result } = this.callbacks.form();

    this.context.result.next({
      type: 'ui',
      request: { id, text, schema },
    });

    return result;
  }
}
