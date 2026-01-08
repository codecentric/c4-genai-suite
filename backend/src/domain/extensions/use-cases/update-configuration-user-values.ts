import { ICommandHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtensionArgumentObjectSpecDto } from '../../../controllers/extensions/dtos';
import { ExtensionEntity, ExtensionRepository } from '../../database';
import { ConfigurationUserEntity, ConfigurationUserRepository } from '../../database/entities/configuration-user';
import { unmaskExtensionValues, validateObjectArgument } from './utils';

export class UpdateConfigurationUserValues {
  constructor(
    public readonly configurationId: number,
    public readonly userId: string,
    public readonly values: Record<string, any>,
  ) {}
}

export class UpdateConfigurationUserValuesResponse {
  constructor() {}
}

@QueryHandler(UpdateConfigurationUserValues)
export class UpdateConfigurationUserValuesHandler implements ICommandHandler<
  UpdateConfigurationUserValues,
  UpdateConfigurationUserValuesResponse
> {
  constructor(
    @InjectRepository(ConfigurationUserEntity)
    private readonly repository: ConfigurationUserRepository,
    @InjectRepository(ExtensionEntity)
    private readonly extensions: ExtensionRepository,
  ) {}

  private mergeConfigurableArguments(extensions: ExtensionEntity[]) {
    return extensions.reduce(
      (prev, curr) => {
        if (curr.configurableArguments) {
          prev.properties[String(curr.id)] = curr.configurableArguments;
        }

        return prev;
      },
      { type: 'object', title: '', properties: {} } as ExtensionArgumentObjectSpecDto,
    );
  }

  async execute(request: UpdateConfigurationUserValues): Promise<UpdateConfigurationUserValuesResponse> {
    const { userId, configurationId, values } = request;

    const extensions = await this.extensions.findBy({ configurationId, enabled: true });
    const validatedValues = validateObjectArgument(unmaskExtensionValues(values), this.mergeConfigurableArguments(extensions));

    await this.repository.upsert(
      {
        user: { id: userId },
        configuration: { id: configurationId },
        values: validatedValues,
        isDefault: true,
      },
      {
        conflictPaths: ['user.id', 'configuration.id', 'isDefault'],
      },
    );

    return new UpdateConfigurationUserValuesResponse();
  }
}
