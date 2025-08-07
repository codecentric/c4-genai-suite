import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { assignDefined } from '../../../lib';
import { ConfigurationEntity, ConfigurationRepository, ExtensionEntity, ExtensionRepository } from '../../database';
import { ConfigurationModel } from '../interfaces';
import { buildConfiguration } from './utils';

export class DuplicateConfiguration {
  constructor(public readonly id: number) {}
}

export class DuplicateConfigurationResponse {
  constructor(public readonly configuration: ConfigurationModel) {}
}

@CommandHandler(DuplicateConfiguration)
export class DuplicateConfigurationHandler implements ICommandHandler<DuplicateConfiguration, DuplicateConfigurationResponse> {
  constructor(
    @InjectRepository(ConfigurationEntity)
    private readonly configurations: ConfigurationRepository,
    @InjectRepository(ExtensionEntity)
    private readonly extensions: ExtensionRepository,
  ) {}

  async execute(command: DuplicateConfiguration): Promise<any> {
    const { id } = command;
    const configuration = await this.configurations.findOne({
      where: { id },
      relations: {
        extensions: true,
        userGroups: true,
      },
    });

    if (!configuration) {
      throw new NotFoundException();
    }

    const entity = this.configurations.create();

    assignDefined(entity, {
      agentName: configuration.agentName,
      chatFooter: configuration.chatFooter,
      chatSuggestions: configuration.chatSuggestions,
      enabled: configuration.enabled,
      executorEndpoint: configuration.executorEndpoint,
      executorHeaders: configuration.executorHeaders,
      name: getSuffix(configuration.name),
      description: configuration.description,
      userGroupsIds: configuration.userGroupsIds,
    });

    entity.userGroups = configuration.userGroups;

    const extensions: ExtensionEntity[] = configuration.extensions;

    if (extensions?.length) {
      entity.extensions = extensions.map((extension: ExtensionEntity) => {
        const extensionEntity = this.extensions.create();
        assignDefined(extensionEntity, {
          name: extension.name,
          enabled: extension.enabled,
          values: extension.values,
          configurableArguments: extension.configurableArguments,
        });
        return extensionEntity;
      });
    }

    const created = await this.configurations.save(entity);
    const result = await buildConfiguration(created);

    return new DuplicateConfigurationResponse(result);
  }
}

function getSuffix(name: string) {
  const separator = '_';
  const format = new Intl.DateTimeFormat('de', { dateStyle: 'short', timeStyle: 'medium' });
  const formattedDate = format.format(new Date()).replace(' ', '');

  if (!name.includes(separator)) {
    return name + separator + formattedDate;
  }

  const lastIndex = name.lastIndexOf(separator);
  const dateFormatPattern = /^\d{1,2}\.\d{1,2}\.\d{2},\d{2}:\d{2}:\d{2}$/;
  const suffix = name.substring(lastIndex + 1);

  if (dateFormatPattern.test(suffix)) {
    return name.substring(0, lastIndex + 1) + formattedDate;
  }
  return name + separator + formattedDate;
}
