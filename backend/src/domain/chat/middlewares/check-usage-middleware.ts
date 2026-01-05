import { HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { addMonths, startOfMonth } from 'date-fns';
import { And, LessThan, MoreThanOrEqual } from 'typeorm';
import {
  BUILTIN_USER_GROUP_ADMIN,
  BUILTIN_USER_GROUP_DEFAULT,
  UsageEntity,
  UsageRepository,
  UserGroupEntity,
  UserGroupRepository,
} from 'src/domain/database';
import { ChatContext, ChatMiddleware, ChatNextDelegate, GetContext } from '../interfaces';

export class CheckUsageMiddleware implements ChatMiddleware {
  order = -1000;

  constructor(
    @InjectRepository(UserGroupEntity)
    private readonly userGroups: UserGroupRepository,

    @InjectRepository(UsageEntity)
    private readonly usages: UsageRepository,
  ) {}

  async invoke(context: ChatContext, getContext: GetContext, next: ChatNextDelegate): Promise<any> {
    const user = context.user;

    if (
      Array.isArray(user.userGroupIds) &&
      (user.userGroupIds.includes(BUILTIN_USER_GROUP_ADMIN) || user.userGroupIds.includes(BUILTIN_USER_GROUP_DEFAULT))
    ) {
      await next(context);
      return;
    }

    // For now, use the first group for quota checks (could be extended to check all groups)
    const userGroupId = Array.isArray(user.userGroupIds) && user.userGroupIds.length > 0 ? user.userGroupIds[0] : undefined;
    if (!userGroupId) {
      await next(context);
      return;
    }

    const userGroup = await this.userGroups.findOneBy({ id: userGroupId });
    const monthlyUserTokens = userGroup?.monthlyUserTokens ?? 0;

    if (!userGroup || monthlyUserTokens < 0) {
      await next(context);
      return;
    }

    const dateFrom = startOfMonth(new Date());
    const dateTo = addMonths(dateFrom, 1);

    if (monthlyUserTokens > 0) {
      const userUsage =
        (await this.usages.sum('count', {
          date: And(MoreThanOrEqual(dateFrom), LessThan(dateTo)),
          userId: user.id,
        })) ?? 0;

      if (userUsage >= monthlyUserTokens) {
        throw new HttpException('Monthly token limit exceeded for user.', HttpStatus.TOO_MANY_REQUESTS);
      }
    }

    await next(context);
  }
}
