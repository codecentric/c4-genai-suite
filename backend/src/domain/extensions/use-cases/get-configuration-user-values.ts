import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigurationUserEntity, ConfigurationUserRepository } from '../../database/entities/configuration-user';
import { ConfigurationUserValuesModel } from '../interfaces';

export class GetConfigurationUserValues {
  constructor(
    public readonly configurationId: number,
    public readonly userId: string,
  ) {}
}

export class GetConfigurationUserValuesResponse {
  constructor(public configuration?: ConfigurationUserValuesModel) {}
}

@QueryHandler(GetConfigurationUserValues)
export class GetConfigurationUserValuesHandler implements IQueryHandler<
  GetConfigurationUserValues,
  GetConfigurationUserValuesResponse
> {
  constructor(
    @InjectRepository(ConfigurationUserEntity)
    private readonly repository: ConfigurationUserRepository,
  ) {}

  async execute(request: GetConfigurationUserValues): Promise<GetConfigurationUserValuesResponse> {
    const { userId, configurationId } = request;

    const entity = await this.repository.findOne({
      where: {
        isDefault: true,
        user: { id: userId },
        configuration: { id: configurationId },
      },
    });

    if (!entity) {
      return new GetConfigurationUserValuesResponse();
    }

    return new GetConfigurationUserValuesResponse({
      id: entity.id,
      values: entity.values,
      isDefault: entity.isDefault,
    });
  }
}
