import { BadRequestException, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ConfigurationEntity, ConfigurationStatus, ExtensionEntity, UserGroupEntity, UserGroupRepository } from '../../database';
import { ConfigurationModel, ExtensionObjectArgument } from '../interfaces';
import { ExplorerService } from '../services';
import { buildConfiguration, validateConfiguration } from './utils';

export interface ImportedExtension {
  name: string;
  enabled: boolean;
  values: Record<string, unknown>;
  configurableArguments?: ExtensionObjectArgument;
}

export interface ImportConfigurationData {
  version?: string;
  exportedAt?: string;
  name: string;
  description: string;
  enabled: boolean;
  agentName?: string;
  chatFooter?: string;
  chatSuggestions?: any[];
  executorEndpoint?: string;
  executorHeaders?: string;
  userGroupIds?: string[];
  extensions: ImportedExtension[];
}

export class ImportConfiguration {
  constructor(public readonly data: ImportConfigurationData) {}
}

export interface ImportConfigurationResponse {
  configuration: ConfigurationModel;
}

@CommandHandler(ImportConfiguration)
export class ImportConfigurationHandler implements ICommandHandler<ImportConfiguration, ImportConfigurationResponse> {
  private readonly logger = new Logger(ImportConfigurationHandler.name);

  constructor(
    @InjectRepository(ConfigurationEntity)
    private readonly repository: Repository<ConfigurationEntity>,
    @InjectRepository(ExtensionEntity)
    private readonly extensionRepository: Repository<ExtensionEntity>,
    @InjectRepository(UserGroupEntity)
    private readonly userGroupRepository: UserGroupRepository,
    private readonly extensionExplorer: ExplorerService,
  ) {}

  async execute(command: ImportConfiguration): Promise<ImportConfigurationResponse> {
    const { data } = command;

    // Check version and warn if different
    const currentVersion = process.env.VERSION || 'unknown';
    if (data.version && data.version !== currentVersion) {
      this.logger.warn(
        `Importing configuration "${data.name}" from version ${data.version}, but current version is ${currentVersion}. Proceeding with import, but compatibility issues may occur.`,
      );
    }

    // Validate that all extensions exist in the system
    const unavailableExtensions: string[] = [];
    for (const ext of data.extensions) {
      const extension = this.extensionExplorer.getExtension(ext.name);
      if (!extension) {
        unavailableExtensions.push(ext.name);
      }
    }

    if (unavailableExtensions.length > 0) {
      this.logger.error(
        `Failed to import configuration "${data.name}": Extensions not available: ${unavailableExtensions.join(', ')}`,
      );
      throw new BadRequestException(
        `The following extensions are not available in this system: ${unavailableExtensions.join(', ')}`,
      );
    }

    // Validate extension configurations
    for (const ext of data.extensions) {
      const extension = this.extensionExplorer.getExtension(ext.name);
      if (extension) {
        try {
          const values = { ...ext.values };
          // Validate configuration against extension spec
          validateConfiguration(values, extension.spec);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error(
            `Failed to import configuration "${data.name}": Invalid configuration for extension "${ext.name}": ${errorMessage}`,
          );
          throw new BadRequestException(`Invalid configuration for extension "${ext.name}": ${errorMessage}`);
        }
      }
    }

    // Validate and resolve user groups
    let userGroups: UserGroupEntity[] = [];
    if (data.userGroupIds && data.userGroupIds.length > 0) {
      userGroups = await this.userGroupRepository.findBy({ id: In(data.userGroupIds) });
      if (userGroups.length === 0) {
        this.logger.warn(
          `Cannot import configuration "${data.name}": none of the specified user groups exist in this system. ` +
            `Requested userGroupIds: ${data.userGroupIds.join(', ')}`,
        );
        throw new BadRequestException('Cannot import configuration: none of the specified user groups exist in this system');
      }
      if (userGroups.length < data.userGroupIds.length) {
        const foundIds = userGroups.map((ug) => ug.id);
        const missingIds = data.userGroupIds.filter((id) => !foundIds.includes(id));
        this.logger.warn(
          `Some user groups not found during import of "${data.name}". Missing: ${missingIds.join(', ')}. Proceeding with available groups.`,
        );
      }
    }

    // Create a new configuration
    const configurationEntity = new ConfigurationEntity();
    configurationEntity.name = data.name;
    configurationEntity.description = data.description;
    configurationEntity.status = data.enabled ? ConfigurationStatus.ENABLED : ConfigurationStatus.DISABLED;
    configurationEntity.agentName = data.agentName;
    configurationEntity.chatFooter = data.chatFooter;
    configurationEntity.chatSuggestions = data.chatSuggestions;
    configurationEntity.executorEndpoint = data.executorEndpoint;
    configurationEntity.executorHeaders = data.executorHeaders;
    configurationEntity.userGroups = userGroups;

    // Save configuration first
    const savedConfiguration = await this.repository.save(configurationEntity);

    // Create extensions
    const extensionEntities: ExtensionEntity[] = [];
    for (const ext of data.extensions) {
      const extensionEntity = new ExtensionEntity();
      extensionEntity.name = ext.name;
      extensionEntity.enabled = ext.enabled;
      extensionEntity.values = { ...ext.values };
      extensionEntity.configurableArguments = ext.configurableArguments;
      extensionEntity.configuration = savedConfiguration;
      extensionEntity.externalId = `${savedConfiguration.id}-${ext.name}`;

      extensionEntities.push(extensionEntity);
    }

    // Save all extensions
    await this.extensionRepository.save(extensionEntities);

    // Reload configuration with extensions
    const reloadedConfiguration = await this.repository.findOne({
      where: { id: savedConfiguration.id },
      relations: ['extensions'],
    });

    if (!reloadedConfiguration) {
      this.logger.error(`Failed to import configuration "${data.name}": Could not reload configuration after save`);
      throw new BadRequestException('Failed to reload imported configuration');
    }

    // Build configuration model
    const configuration = await buildConfiguration(reloadedConfiguration, this.extensionExplorer, true, false);

    this.logger.log(
      `Successfully imported configuration "${data.name}" (ID: ${savedConfiguration.id}) with ${extensionEntities.length} extension(s)`,
    );

    return { configuration };
  }
}
