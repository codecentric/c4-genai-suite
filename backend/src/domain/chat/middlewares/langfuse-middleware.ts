import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatContext, ChatMiddleware, ChatNextDelegate, GetContext } from 'src/domain/chat';
import { ExecuteMiddleware } from './execute-middleware';

@Injectable()
export class LangfuseMiddleware implements ChatMiddleware {
  order = ExecuteMiddleware.ORDER - 1;

  constructor(private configService: ConfigService) {}

  async invoke(context: ChatContext, _: GetContext, next: ChatNextDelegate): Promise<any> {
    const publicKey = this.configService.get<string>('LANGFUSE_PUBLIC_KEY');
    const secretKey = this.configService.get<string>('LANGFUSE_SECRET_KEY');
    const baseUrl = this.configService.get<string>('LANGFUSE_BASE_URL', 'https://cloud.langfuse.com');
    if (publicKey && secretKey && baseUrl) {
      const { CallbackHandler } = await import('langfuse-langchain');
      context.callbacks.push(new CallbackHandler({ publicKey, secretKey, baseUrl }));
    }

    return next(context);
  }
}
