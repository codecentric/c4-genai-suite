import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigurationEntity } from '../../database';
import { ExplorerService } from '../services';
import { buildConfiguration, maskKeyValues } from './utils';

export class ExportConfiguration {
  constructor(public readonly id: number) {}
}

export interface ExportedExtension {
  name: string;
  enabled: boolean;
  values: Record<string, any>;
  configurableArguments?: any;
}

export interface ExportedConfiguration {
  version: string;
  exportedAt: string;
  originId: number;
  name: string;
  description: string;
  enabled: boolean;
  agentName?: string;
  chatFooter?: string;
  chatSuggestions?: any[];
  executorEndpoint?: string;
  executorHeaders?: string;
  userGroupIds: string[];
  extensions: ExportedExtension[];
}

export type ExportConfigurationResponse = ExportedConfiguration;

@QueryHandler(ExportConfiguration)
export class ExportConfigurationHandler implements IQueryHandler<ExportConfiguration, ExportConfigurationResponse> {
  constructor(
    @InjectRepository(ConfigurationEntity)
    private readonly repository: Repository<ConfigurationEntity>,
    private readonly extensionExplorer: ExplorerService,
  ) {}

  async execute(query: ExportConfiguration): Promise<ExportConfigurationResponse> {
    const configurationEntity = await this.repository.findOne({
      where: { id: query.id },
      relations: ['extensions'],
    });

    if (!configurationEntity) {
      throw new NotFoundException(`Configuration with id ${query.id} not found`);
    }

    // Build configuration with extensions
    const configuration = await buildConfiguration(configurationEntity, this.extensionExplorer, true, false);

    // Prepare export data with masked sensitive values
    const exportedExtensions: ExportedExtension[] = [];

    for (const ext of configuration.extensions || []) {
      // Mask sensitive values (passwords)
      maskKeyValues(ext);

      exportedExtensions.push({
        name: ext.name,
        enabled: ext.enabled,
        values: ext.values,
        configurableArguments: ext.configurableArguments,
      });
    }

    return {
      version: process.env.VERSION || 'unknown',
      exportedAt: new Date().toISOString(),
      originId: configuration.id,
      name: configuration.name,
      description: configuration.description,
      enabled: false,
      agentName: configuration.agentName,
      chatFooter: configuration.chatFooter,
      chatSuggestions: configuration.chatSuggestions,
      executorEndpoint: configuration.executorEndpoint,
      executorHeaders: configuration.executorHeaders,
      userGroupIds: configuration.userGroupIds,
      extensions: exportedExtensions,
    };
  }
}
