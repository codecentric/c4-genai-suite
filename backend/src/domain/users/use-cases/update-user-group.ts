import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { AuditLogService, PerformedBy } from 'src/domain/audit-log';
import { UserGroupEntity, UserGroupRepository } from 'src/domain/database';
import { assignWithUndefined } from 'src/lib';
import { UserGroup } from '../interfaces';
import { buildUserGroup, buildUserGroupSnapshot } from './utils';

type Values = Pick<UserGroup, 'monthlyTokens' | 'monthlyUserTokens' | 'name'>;

export class UpdateUserGroup {
  constructor(
    public readonly id: string,
    public readonly values: Values,
    public readonly performedBy: PerformedBy,
  ) {}
}

export class UpdateUserGroupResponse {
  constructor(public readonly userGroup: UserGroup) {}
}

@CommandHandler(UpdateUserGroup)
export class UpdateUserGroupHandler implements ICommandHandler<UpdateUserGroup, UpdateUserGroupResponse> {
  constructor(
    @InjectRepository(UserGroupEntity)
    private readonly userGroups: UserGroupRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async execute(request: UpdateUserGroup): Promise<UpdateUserGroupResponse> {
    const { id, values, performedBy } = request;
    const { monthlyTokens, monthlyUserTokens, name } = values;

    const entity = await this.userGroups.findOneBy({ id });

    if (!entity) {
      throw new NotFoundException();
    }

    if (entity.isBuiltIn) {
      throw new BadRequestException('Cannot update builtin user group.');
    }

    assignWithUndefined(entity, { monthlyTokens, monthlyUserTokens, name });

    // Use the save method otherwise we would not get previous values.
    const updated = await this.userGroups.save(entity);
    const result = buildUserGroup(updated);

    await this.auditLogService.createAuditLog({
      entityType: 'userGroup',
      entityId: updated.id,
      action: 'update',
      userId: performedBy.id,
      userName: performedBy.name,
      snapshot: buildUserGroupSnapshot(result),
    });

    return new UpdateUserGroupResponse(result);
  }
}
