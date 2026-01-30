import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { AuditLogService, PerformedBy } from 'src/domain/audit-log';
import { UserGroupEntity, UserGroupRepository } from 'src/domain/database';
import { buildUserGroup, buildUserGroupSnapshot } from './utils';

export class DeleteUserGroup {
  constructor(
    public readonly id: string,
    public readonly performedBy: PerformedBy,
  ) {}
}

@CommandHandler(DeleteUserGroup)
export class DeleteUserGroupHandler implements ICommandHandler<DeleteUserGroup, void> {
  constructor(
    @InjectRepository(UserGroupEntity)
    private readonly userGroups: UserGroupRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async execute(command: DeleteUserGroup): Promise<void> {
    const { id, performedBy } = command;

    const entity = await this.userGroups.findOne({ where: { id }, relations: ['users'] });

    if (!entity) {
      throw new NotFoundException();
    }

    if (entity.users?.length > 0) {
      throw new BadRequestException('Cannot delete a user group with existing users.');
    }

    if (entity.isBuiltIn) {
      throw new BadRequestException('Cannot delete builtin user group.');
    }

    // Capture snapshot before deletion for audit log
    const userGroupSnapshot = buildUserGroupSnapshot(buildUserGroup(entity));

    const result = await this.userGroups.delete({ id });

    if (!result.affected) {
      throw new NotFoundException();
    }

    await this.auditLogService.createAuditLog({
      entityType: 'userGroup',
      entityId: id,
      action: 'delete',
      userId: performedBy.id,
      userName: performedBy.name,
      snapshot: userGroupSnapshot,
    });
  }
}
