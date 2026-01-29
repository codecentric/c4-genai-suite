import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import * as uuid from 'uuid';
import { AuditLogService, PerformedBy } from 'src/domain/audit-log';
import { UserGroupEntity, UserGroupRepository } from 'src/domain/database';
import { assignDefined } from 'src/lib';
import { UserGroup } from '../interfaces';
import { buildUserGroup } from './utils';

type Values = Pick<UserGroup, 'monthlyTokens' | 'monthlyUserTokens' | 'name'>;

export class CreateUserGroup {
  constructor(
    public readonly values: Values,
    public readonly performedBy: PerformedBy,
  ) {}
}

export class CreateUserGroupResponse {
  constructor(public readonly userGroup: UserGroup) {}
}

@CommandHandler(CreateUserGroup)
export class CreateUserGroupHandler implements ICommandHandler<CreateUserGroup, CreateUserGroupResponse> {
  constructor(
    @InjectRepository(UserGroupEntity)
    private readonly userGroups: UserGroupRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async execute(request: CreateUserGroup): Promise<CreateUserGroupResponse> {
    const { values, performedBy } = request;
    const { monthlyTokens, monthlyUserTokens, name } = values;

    const entity = this.userGroups.create({ id: uuid.v4() });

    // Assign the object manually to avoid updating unexpected values.
    assignDefined(entity, { monthlyTokens, monthlyUserTokens, name });

    // Use the save method otherwise we would not get previous values.
    const created = await this.userGroups.save(entity);
    const result = buildUserGroup(created);

    await this.auditLogService.createAuditLog({
      entityType: 'userGroup',
      entityId: created.id,
      action: 'create',
      userId: performedBy.id,
      userName: performedBy.name,
      snapshot: result,
    });

    return new CreateUserGroupResponse(result);
  }
}
