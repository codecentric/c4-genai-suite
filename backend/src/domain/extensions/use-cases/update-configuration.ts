import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not } from 'typeorm';
import { AuditLogService, PerformedBy } from 'src/domain/audit-log';
import {
  ConfigurationEntity,
  ConfigurationRepository,
  ConfigurationStatus,
  UserGroupEntity,
  UserGroupRepository,
} from 'src/domain/database';
import { assignDefined } from 'src/lib';
import { ConfigurationModel } from '../interfaces';
import { buildConfiguration, buildConfigurationSnapshot } from './utils';

type Values = Partial<
  Pick<
    ConfigurationModel,
    | 'agentName'
    | 'chatFooter'
    | 'chatSuggestions'
    | 'enabled'
    | 'executorEndpoint'
    | 'executorHeaders'
    | 'name'
    | 'description'
    | 'userGroupIds'
  >
>;

export class UpdateConfiguration {
  constructor(
    public readonly id: number,
    public readonly values: Values,
    public readonly performedBy: PerformedBy,
  ) {}
}

export class UpdateConfigurationResponse {
  constructor(public readonly configuration: ConfigurationModel) {}
}

@CommandHandler(UpdateConfiguration)
export class UpdateConfigurationHandler implements ICommandHandler<UpdateConfiguration, UpdateConfigurationResponse> {
  constructor(
    @InjectRepository(ConfigurationEntity)
    private readonly configurations: ConfigurationRepository,
    @InjectRepository(UserGroupEntity)
    private readonly userGroups: UserGroupRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async execute(command: UpdateConfiguration): Promise<UpdateConfigurationResponse> {
    const { id, values, performedBy } = command;
    const {
      agentName,
      chatFooter,
      chatSuggestions,
      enabled,
      executorEndpoint,
      executorHeaders,
      name,
      description,
      userGroupIds,
    } = values;

    const entity = await this.configurations.findOne({
      where: { id, status: Not(ConfigurationStatus.DELETED) },
      relations: {
        userGroups: true,
      },
    });

    if (!entity) {
      throw new NotFoundException();
    }

    if (userGroupIds) {
      entity.userGroups = await this.userGroups.findBy({ id: In(userGroupIds) });
    }

    // Assign the object manually to avoid updating unexpected values.
    assignDefined(entity, {
      agentName,
      chatFooter,
      chatSuggestions,
      status: enabled ? ConfigurationStatus.ENABLED : ConfigurationStatus.DISABLED,
      executorEndpoint,
      executorHeaders,
      name,
      description,
    });

    // Use the save method otherwise we would not get previous values.
    const updated = await this.configurations.save(entity);
    const result = await buildConfiguration(updated);

    await this.auditLogService.createAuditLog({
      entityType: 'configuration',
      entityId: String(updated.id),
      action: 'update',
      userId: performedBy.id,
      userName: performedBy.name,
      snapshot: buildConfigurationSnapshot(result),
    });

    return new UpdateConfigurationResponse(result);
  }
}
