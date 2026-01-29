import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { AuditLogService, PerformedBy } from 'src/domain/audit-log';
import { ConfigurationEntity, ConfigurationRepository, ExtensionEntity, ExtensionRepository } from 'src/domain/database';
import { ExplorerService } from '../services';
import { buildExtension, buildExtensionSnapshot } from './utils';

export class DeleteExtension {
  constructor(
    public readonly id: number,
    public readonly performedBy: PerformedBy,
  ) {}
}

@CommandHandler(DeleteExtension)
export class DeleteExtensionHandler implements ICommandHandler<DeleteExtension, void> {
  constructor(
    @InjectRepository(ExtensionEntity)
    private readonly extensions: ExtensionRepository,
    @InjectRepository(ConfigurationEntity)
    private readonly configurations: ConfigurationRepository,
    private readonly explorer: ExplorerService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async execute(command: DeleteExtension): Promise<void> {
    const { id, performedBy } = command;

    // Get extension before deletion for audit log
    const entity = await this.extensions.findOneBy({ id });
    let extensionSnapshot: Record<string, any> | null = null;

    if (entity) {
      const extensionConfig = this.explorer.getExtension(entity.name);
      const configuration = await this.configurations.findOneBy({ id: entity.configurationId });
      if (extensionConfig) {
        const configuredExtension = await buildExtension(entity, extensionConfig);
        extensionSnapshot = buildExtensionSnapshot(configuredExtension, entity.configurationId, configuration?.name);
      }
    }

    const result = await this.extensions.delete({ id });

    if (!result.affected) {
      throw new NotFoundException();
    }

    if (extensionSnapshot) {
      await this.auditLogService.createAuditLog({
        entityType: 'extension',
        entityId: String(id),
        action: 'delete',
        userId: performedBy.id,
        userName: performedBy.name,
        snapshot: extensionSnapshot,
      });
    }
  }
}
