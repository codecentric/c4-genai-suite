import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { AuditLogService, PerformedBy } from 'src/domain/audit-log';
import { UserEntity, UserRepository } from 'src/domain/database';
import { buildUser, buildUserSnapshot } from './utils';

export class DeleteUser {
  constructor(
    public readonly id: string,
    public readonly performedBy: PerformedBy,
  ) {}
}

@CommandHandler(DeleteUser)
export class DeleteUserHandler implements ICommandHandler<DeleteUser, void> {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: UserRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async execute(command: DeleteUser): Promise<void> {
    const { id, performedBy } = command;

    // Get user before deletion for audit log
    const entity = await this.users.findOneBy({ id });
    const userSnapshot = entity ? buildUserSnapshot(buildUser(entity)) : null;

    const result = await this.users.delete({ id });

    if (!result.affected) {
      throw new NotFoundException();
    }

    if (userSnapshot) {
      await this.auditLogService.createAuditLog({
        entityType: 'user',
        entityId: id,
        action: 'delete',
        userId: performedBy.id,
        userName: performedBy.name,
        snapshot: userSnapshot,
      });
    }
  }
}
