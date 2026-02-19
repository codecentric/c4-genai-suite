import { BadRequestException, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DataSource, In, QueryRunner } from 'typeorm';
import { I18nService } from 'src/localization/i18n.service';
import { ConfigurationEntity, ConfigurationStatus, ExtensionEntity, UserGroupEntity } from '../../database';
import { ConfigurationModel } from '../interfaces';
import { ExplorerService } from '../services';
import { PortableConfiguration, PortableExtension } from './export-configuration';
import { buildConfiguration, validateConfiguration } from './utils';

export class ImportConfiguration {
  constructor(public readonly data: PortableConfiguration) {}
}

export interface ImportConfigurationResponse {
  configuration: ConfigurationModel;
  warnings: string[];
}

@CommandHandler(ImportConfiguration)
export class ImportConfigurationHandler implements ICommandHandler<ImportConfiguration, ImportConfigurationResponse> {
  private readonly logger = new Logger(ImportConfigurationHandler.name);

  constructor(
    private dataSource: DataSource,
    private readonly extensionExplorer: ExplorerService,
    private readonly i18n: I18nService,
  ) {}

  async execute(command: ImportConfiguration): Promise<ImportConfigurationResponse> {
    const { data } = command;
    const warnings: string[] = [];
    this.check(data, warnings);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const userGroups = await this.validateAndResolveUserGroups(data, queryRunner, warnings);
      const configurationEntity = this.createConfigurationEntity(data, userGroups);
      const savedConfiguration = await queryRunner.manager.save(ConfigurationEntity, configurationEntity);

      // Create extensions
      const extensionEntities: ExtensionEntity[] = [];
      for (const portableExtension of data.extensions) {
        const extensionEntity = this.createExtensionEntity(portableExtension, savedConfiguration);
        extensionEntities.push(extensionEntity);
      }

      await queryRunner.manager.save(ExtensionEntity, extensionEntities);
      await queryRunner.commitTransaction();

      // Reload configuration with extensions (outside transaction)
      const reloadedConfiguration = await this.reloadConfiguration(savedConfiguration);

      // Build configuration model
      const configuration = await buildConfiguration(reloadedConfiguration, this.extensionExplorer, true, false);
      this.logger.log(
        `Successfully imported configuration "${data.name}" (ID: ${savedConfiguration.id}) with ${extensionEntities.length} extension(s)`,
      );

      return { configuration, warnings };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Perform basic checks on the imported data before processing
   * @param data
   * @param warnings
   * @private
   */
  private check(data: PortableConfiguration, warnings: string[]) {
    this.checkVersion(data, warnings);
    this.validateExtensionsExists(data.extensions);
    this.validateExtensions(data.extensions);
  }

  private async reloadConfiguration(savedConfiguration: ConfigurationEntity) {
    const reloadedConfiguration = await this.dataSource.manager.findOne(ConfigurationEntity, {
      where: { id: savedConfiguration.id },
      relations: ['extensions'],
    });

    if (!reloadedConfiguration) throw new BadRequestException('Failed to reload imported configuration');
    return reloadedConfiguration;
  }

  private createExtensionEntity(ext: PortableExtension, savedConfiguration: ConfigurationEntity) {
    const extensionEntity = new ExtensionEntity();
    extensionEntity.name = ext.name;
    extensionEntity.enabled = ext.enabled;
    extensionEntity.values = { ...ext.values };
    extensionEntity.configurableArguments = ext.configurableArguments;
    extensionEntity.configurationId = savedConfiguration.id;
    extensionEntity.externalId = `${savedConfiguration.id}-${ext.name}`;
    return extensionEntity;
  }

  private createConfigurationEntity(data: PortableConfiguration, userGroups: any[] | UserGroupEntity[]) {
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
    return configurationEntity;
  }

  private async validateAndResolveUserGroups(data: PortableConfiguration, queryRunner: QueryRunner, warnings: string[]) {
    if (!data.userGroupIds?.length) return [];
    const userGroups = await queryRunner.manager.findBy(UserGroupEntity, { id: In(data.userGroupIds) });
    if (userGroups.length === 0) {
      throw new BadRequestException('Cannot import configuration: none of the specified user groups exist in this system');
    }
    if (userGroups.length < data.userGroupIds.length) {
      const foundIds = userGroups.map((ug) => ug.id);
      const missingIds = data.userGroupIds.filter((id) => !foundIds.includes(id));
      this.logger.warn(
        `Some user groups not found during import of "${data.name}". Missing: ${missingIds.join(', ')}. Proceeding with available groups.`,
      );
      warnings.push(
        this.i18n.t('texts.configuration.warningMissingUserGroups', { name: data.name, missingIds: missingIds.join(', ') }),
      );
    }

    return userGroups;
  }

  /**
   * Validate imported values against extension spec
   * @private
   * @param portableExtensions
   */
  private validateExtensions(portableExtensions: PortableExtension[]) {
    for (const portableExtension of portableExtensions) {
      const extension = this.extensionExplorer.getExtension(portableExtension.name);
      if (!extension) continue; // Already handled missing extensions above
      try {
        const values = { ...portableExtension.values };
        validateConfiguration(values, extension.spec);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new BadRequestException(`Invalid configuration for extension "${portableExtension.name}": ${errorMessage}`);
      }
    }
  }

  /**
   * Validate that all extensions exist in the system
   * @param portableExtensions
   * @private
   */
  private validateExtensionsExists(portableExtensions: PortableExtension[]) {
    const unavailableExtensions: string[] = [];
    for (const portableExtension of portableExtensions) {
      const extension = this.extensionExplorer.getExtension(portableExtension.name);
      if (!extension) unavailableExtensions.push(portableExtension.name);
    }

    if (unavailableExtensions.length > 0) {
      throw new BadRequestException(
        `The following extensions are not available in this system: ${unavailableExtensions.join(', ')}`,
      );
    }
  }

  /**
   * Check version and warn if different
   * @param data
   * @param warnings
   * @private
   */
  private checkVersion(data: PortableConfiguration, warnings: string[]) {
    const currentVersion = process.env.VERSION || 'unknown';
    if (data.version && data.version !== currentVersion) {
      warnings.push(
        this.i18n.t('texts.configuration.warningVersionMismatch', {
          name: data.name,
          version: data.version,
          currentVersion,
        }),
      );
    }
  }
}
