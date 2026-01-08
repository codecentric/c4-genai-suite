import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { trackUsage, UsageEntity, UsageRepository } from 'src/domain/database';
import { ChatContext, ChatMiddleware, ChatNextDelegate, GetContext } from '../interfaces';

@Injectable()
export class StorageUsageMiddleware implements ChatMiddleware {
  private readonly logger = new Logger(StorageUsageMiddleware.name);

  constructor(
    @InjectRepository(UsageEntity)
    private readonly usages: UsageRepository,
  ) {}

  async invoke(context: ChatContext, getContext: GetContext, next: ChatNextDelegate): Promise<any> {
    await next(context);

    const usage = context.tokenUsage;

    if (!usage) {
      return;
    }

    try {
      await trackUsage(this.usages, {
        count: usage.tokenCount,
        counter: 'token_usage',
        date: new Date(),
        key: usage.llm,
        subKey: usage.model,
        userId: context.user.id,
      });
    } catch (err) {
      this.logger.error('Failed to update usage data.', err);
    }
  }
}
