import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { UserGroupEntity, UserGroupRepository } from 'src/domain/database';
import { assignWithUndefined } from 'src/lib';
import { UserGroup } from '../interfaces';
import { buildUserGroup } from './utils';

type Values = Pick<UserGroup, 'monthlyUserTokens' | 'name'>;

export class UpdateUserGroup {
  constructor(
    public readonly id: string,
    public readonly values: Values,
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
  ) {}

  async execute(request: UpdateUserGroup): Promise<UpdateUserGroupResponse> {
    const { id, values } = request;
    const { monthlyUserTokens, name } = values;

    const entity = await this.userGroups.findOneBy({ id });

    if (!entity) {
      throw new NotFoundException();
    }

    if (entity.isBuiltIn) {
      throw new BadRequestException('Cannot update builtin user group.');
    }

    assignWithUndefined(entity, { monthlyUserTokens, name });

    // Use the save method otherwise we would not get previous values.
    const updated = await this.userGroups.save(entity);
    const result = buildUserGroup(updated);

    return new UpdateUserGroupResponse(result);
  }
}
