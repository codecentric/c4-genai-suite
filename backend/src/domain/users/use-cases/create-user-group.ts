import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import * as uuid from 'uuid';
import { UserGroupEntity, UserGroupRepository } from 'src/domain/database';
import { assignDefined } from 'src/lib';
import { UserGroup } from '../interfaces';
import { buildUserGroup } from './utils';

type Values = Pick<UserGroup, 'monthlyUserTokens' | 'name'>;

export class CreateUserGroup {
  constructor(public readonly values: Values) {}
}

export class CreateUserGroupResponse {
  constructor(public readonly userGroup: UserGroup) {}
}

@CommandHandler(CreateUserGroup)
export class CreateUserGroupHandler implements ICommandHandler<CreateUserGroup, CreateUserGroupResponse> {
  constructor(
    @InjectRepository(UserGroupEntity)
    private readonly userGroups: UserGroupRepository,
  ) {}

  async execute(request: CreateUserGroup): Promise<CreateUserGroupResponse> {
    const { values } = request;
    const { monthlyUserTokens, name } = values;

    const entity = this.userGroups.create({ id: uuid.v4() });

    // Assign the object manually to avoid updating unexpected values.
    assignDefined(entity, { monthlyUserTokens, name });

    // Use the save method otherwise we would not get previous values.
    const created = await this.userGroups.save(entity);
    const result = buildUserGroup(created);

    return new CreateUserGroupResponse(result);
  }
}
