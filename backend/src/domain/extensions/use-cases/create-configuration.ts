import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { In } from 'typeorm';
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

export class CreateConfiguration {
  constructor(
    public readonly values: Values,
    public readonly performedBy: PerformedBy,
  ) {}
}

export class CreateConfigurationResponse {
  constructor(public readonly configuration: ConfigurationModel) {}
}

@CommandHandler(CreateConfiguration)
export class CreateConfigurationHandler implements ICommandHandler<CreateConfiguration, CreateConfigurationResponse> {
  constructor(
    @InjectRepository(ConfigurationEntity)
    private readonly configurations: ConfigurationRepository,
    @InjectRepository(UserGroupEntity)
    private readonly userGroups: UserGroupRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async execute(command: CreateConfiguration): Promise<CreateConfigurationResponse> {
    const { values, performedBy } = command;
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

    const entity = this.configurations.create();

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
    const created = await this.configurations.save(entity);
    const result = await buildConfiguration(created);

    await this.auditLogService.createAuditLog({
      entityType: 'configuration',
      entityId: String(created.id),
      action: 'create',
      userId: performedBy.id,
      userName: performedBy.name,
      snapshot: buildConfigurationSnapshot(result),
    });

    return new CreateConfigurationResponse(result);
  }
}
