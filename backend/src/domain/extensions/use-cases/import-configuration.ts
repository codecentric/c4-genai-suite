import { BadRequestException, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigurationEntity, ConfigurationStatus, ExtensionEntity } from '../../database';
import { ConfigurationModel } from '../interfaces';
import { ExplorerService } from '../services';
import { buildConfiguration, validateConfiguration } from './utils';

export interface ImportedExtension {
  name: string;
  enabled: boolean;
  values: Record<string, any>;
  configurableArguments?: any;
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
    configurationEntity.userGroupIds = data.userGroupIds || [];

    // Save configuration first
    const savedConfiguration = await this.repository.save(configurationEntity);

    // Create extensions
    const extensionEntities: ExtensionEntity[] = [];
    for (const ext of data.extensions) {
      const extensionEntity = new ExtensionEntity();
      extensionEntity.name = ext.name;
      extensionEntity.enabled = ext.enabled;
      extensionEntity.values = { ...ext.values };
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
