import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { In } from 'typeorm';
import {
  ConfigurationEntity,
  ConfigurationRepository,
  ConfigurationStatus,
  UserGroupEntity,
  UserGroupRepository,
} from 'src/domain/database';
import { assignDefined } from 'src/lib';
import { ConfigurationModel } from '../interfaces';
import { buildConfiguration } from './utils';

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
    | 'userGroupsIds'
  >
>;

export class CreateConfiguration {
  constructor(public readonly values: Values) {}
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
  ) {}

  async execute(command: CreateConfiguration): Promise<any> {
    const { values } = command;
    const {
      agentName,
      chatFooter,
      chatSuggestions,
      enabled,
      executorEndpoint,
      executorHeaders,
      name,
      description,
      userGroupsIds,
    } = values;

    const entity = this.configurations.create();

    if (userGroupsIds) {
      entity.userGroups = await this.userGroups.findBy({ id: In(userGroupsIds) });
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

    return new CreateConfigurationResponse(result);
  }
}
