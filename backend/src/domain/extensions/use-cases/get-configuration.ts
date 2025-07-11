import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigurationEntity, ConfigurationRepository } from 'src/domain/database';
import { ConfigurationModel } from '../interfaces';
import { buildConfiguration } from './utils';

export class GetConfiguration {
  constructor(public readonly id: number) {}
}

export class GetConfigurationResponse {
  constructor(public readonly configuration: ConfigurationModel) {}
}

@QueryHandler(GetConfiguration)
export class GetConfigurationHandler implements IQueryHandler<GetConfiguration, GetConfigurationResponse> {
  constructor(
    @InjectRepository(ConfigurationEntity)
    private readonly extensions: ConfigurationRepository,
  ) {}

  async execute(request: GetConfiguration): Promise<GetConfigurationResponse> {
    const { id } = request;

    const entity = await this.extensions.findOneBy({ id });

    if (!entity) {
      throw new NotFoundException(`Configuration with id ${id} was not found`);
    }

    const result = await buildConfiguration(entity);

    return new GetConfigurationResponse(result);
  }
}
