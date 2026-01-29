import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { AuditLogService, PerformedBy } from 'src/domain/audit-log';
import { ConfigurationEntity, ConfigurationRepository, ExtensionEntity, ExtensionRepository } from 'src/domain/database';
import { assignDefined } from 'src/lib';
import { ConfiguredExtension, ExtensionConfiguration, ExtensionObjectArgument } from '../interfaces';
import { ExplorerService } from '../services';
import { buildExtension, buildExtensionSnapshot, maskArgumentDefault, maskKeyValues, validateConfiguration } from './utils';

type Values = {
  enabled: boolean;
  values: ExtensionConfiguration;
  name: string;
  configurableArguments?: ExtensionObjectArgument;
};

export class CreateExtension {
  constructor(
    public readonly configurationId: number,
    public readonly values: Values,
    public readonly performedBy: PerformedBy,
  ) {}
}

export class CreateExtensionResponse {
  constructor(public readonly extension: ConfiguredExtension) {}
}

@CommandHandler(CreateExtension)
export class CreateExtensionHandler implements ICommandHandler<CreateExtension, CreateExtensionResponse> {
  constructor(
    private readonly explorer: ExplorerService,
    @InjectRepository(ExtensionEntity)
    private readonly extensions: ExtensionRepository,
    @InjectRepository(ConfigurationEntity)
    private readonly configurations: ConfigurationRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async execute(command: CreateExtension): Promise<CreateExtensionResponse> {
    const { configurationId, performedBy } = command;
    const { enabled, name, values, configurableArguments } = command.values;

    if (configurableArguments?.properties) {
      Object.entries(configurableArguments.properties)
        .filter(([key]) => values[key] != null)
        .map(([key, value]) => {
          if (value.type === 'string' || value.type === 'number' || value.type === 'boolean') {
            value.default = values[key] as typeof value.default;
          }
          maskArgumentDefault(value);
        });
    }

    const extension = this.explorer.getExtension(name);

    if (!extension) {
      throw new BadRequestException(['unknown extension']);
    }

    const entity = this.extensions.create({ configurationId, configurableArguments, enabled, name, values });
    const configuredExtension = await ConfiguredExtension.create(extension, entity, true, true);
    entity.values = validateConfiguration(values, configuredExtension.spec);
    assignDefined(entity, { configurationId, enabled, configurableArguments, name });

    await this.extensions.save(entity);
    const result = await buildExtension(entity, extension, true);
    maskKeyValues(result);
    result.id = entity.id;

    // Get configuration name for audit log
    const configuration = await this.configurations.findOneBy({ id: configurationId });

    await this.auditLogService.createAuditLog({
      entityType: 'extension',
      entityId: String(entity.id),
      action: 'create',
      userId: performedBy.id,
      userName: performedBy.name,
      snapshot: buildExtensionSnapshot(result, configurationId, configuration?.name),
    });

    return new CreateExtensionResponse(result);
  }
}
