import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { AuditLogService, PerformedBy } from 'src/domain/audit-log';
import { SettingEntity, SettingRepository } from 'src/domain/database';
import { Settings } from '../interfaces';
import { buildSettings, buildSettingsSnapshot } from './utils';

export class UpdateSettings {
  constructor(
    public readonly update: Partial<Settings>,
    public readonly performedBy: PerformedBy,
  ) {}
}

export class UpdateSettingsResponse {
  constructor(public readonly settings: Settings) {}
}

@CommandHandler(UpdateSettings)
export class UpdateSettingsHandler implements ICommandHandler<UpdateSettings, UpdateSettingsResponse> {
  constructor(
    @InjectRepository(SettingEntity)
    private readonly settings: SettingRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async execute(request: UpdateSettings): Promise<UpdateSettingsResponse> {
    const { update, performedBy } = request;

    const updated = await this.settings.save({ id: 1, ...update });
    const result = buildSettings(updated);

    await this.auditLogService.createAuditLog({
      entityType: 'settings',
      entityId: '1',
      action: 'update',
      userId: performedBy.id,
      userName: performedBy.name,
      snapshot: buildSettingsSnapshot(result),
    });

    return new UpdateSettingsResponse(result);
  }
}
