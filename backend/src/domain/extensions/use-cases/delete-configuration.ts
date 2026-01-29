import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DataSource, IsNull, Not } from 'typeorm';
import { AuditLogService, PerformedBy } from 'src/domain/audit-log';
import { ConfigurationEntity, ConfigurationStatus, ConversationEntity } from 'src/domain/database';
import { assignDefined } from 'src/lib';
import { I18nService } from 'src/localization/i18n.service';
import { buildConfiguration, buildConfigurationSnapshot } from './utils';

export class DeleteConfiguration {
  constructor(
    public readonly id: number,
    public readonly performedBy: PerformedBy,
  ) {}
}

@CommandHandler(DeleteConfiguration)
export class DeleteConfigurationHandler implements ICommandHandler<DeleteConfiguration, void> {
  constructor(
    private dataSource: DataSource,
    private readonly i18n: I18nService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async execute(command: DeleteConfiguration): Promise<void> {
    const { id, performedBy } = command;

    // Get configuration before deletion for audit log
    const configEntity = await this.dataSource.manager.findOne(ConfigurationEntity, {
      where: { id },
      relations: { userGroups: true },
    });
    const configSnapshot = configEntity ? buildConfigurationSnapshot(await buildConfiguration(configEntity)) : null;
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    await queryRunner.startTransaction();
    try {
      // First, we try to actually delete the assistant. This will work if no messages for this assistant exist.
      // The empty conversation must be deleted, if it references the assistant.
      await queryRunner.manager.delete(ConversationEntity, { configurationId: id, llm: IsNull(), name: IsNull() });
      await queryRunner.manager.delete(ConfigurationEntity, { id: command.id });
      await queryRunner.commitTransaction();
      await queryRunner.release();

      if (configSnapshot) {
        await this.auditLogService.createAuditLog({
          entityType: 'configuration',
          entityId: String(id),
          action: 'delete',
          userId: performedBy.id,
          userName: performedBy.name,
          snapshot: configSnapshot,
        });
      }
      return;
    } catch (_error) {
      await queryRunner.rollbackTransaction();
    }

    await queryRunner.startTransaction();
    try {
      // If it does not work, because there are still messages referring to them,
      // we just mark the configuration as deleted.
      // That will only have the effect that the configuration will not be shown in any user facing menu,
      // but is still available for the existing messages to reference to.
      // For conversations which have this assistant as the active one, we need to supply a replacement.
      // We will just use the first enabled assistant. If the user tries to delete the last one, we show an error.
      const toBeDeleted = await queryRunner.manager.findOne(ConfigurationEntity, {
        where: { id },
        relations: ['conversations'],
      });
      if (!toBeDeleted) {
        throw new NotFoundException();
      }
      const replacement = await queryRunner.manager.findOne(ConfigurationEntity, {
        where: { id: Not(id), status: ConfigurationStatus.ENABLED },
        order: { id: 'ASC' },
      });
      if (!replacement) {
        throw new BadRequestException(this.i18n.t('texts.chat.errorLastConfigurationdDeleted'));
      }

      await queryRunner.manager.delete(ConversationEntity, { configurationId: id, llm: IsNull(), name: IsNull() });
      if (toBeDeleted.conversations) {
        for (const conversation of toBeDeleted.conversations) {
          conversation.configuration = replacement;
          await queryRunner.manager.update(
            ConversationEntity,
            { id: conversation.id },
            {
              configurationId: replacement.id,
              updatedAt: () => '"updatedAt"',
            },
          );
        }
      }
      assignDefined(toBeDeleted, {
        status: ConfigurationStatus.DELETED,
        conversations: [],
      });

      await queryRunner.manager.save(ConfigurationEntity, toBeDeleted);

      await queryRunner.commitTransaction();

      if (configSnapshot) {
        await this.auditLogService.createAuditLog({
          entityType: 'configuration',
          entityId: String(id),
          action: 'delete',
          userId: performedBy.id,
          userName: performedBy.name,
          snapshot: configSnapshot,
        });
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
