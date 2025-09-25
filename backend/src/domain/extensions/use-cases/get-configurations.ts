import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Not } from 'typeorm';
import { BUILTIN_USER_GROUP_ADMIN, ConfigurationEntity, ConfigurationRepository, ConfigurationStatus } from 'src/domain/database';
import { User } from 'src/domain/users';
import { ConfigurationModel } from '../interfaces';
import { ExplorerService } from '../services';
import { buildConfiguration } from './utils';

export class GetConfigurations {
  constructor(
    public readonly user: User,
    public readonly enabled: boolean,
    public readonly withExtensions: boolean = false,
  ) {}
}

export class GetConfigurationsResponse {
  constructor(public readonly configurations: ConfigurationModel[]) {}
}

@QueryHandler(GetConfigurations)
export class GetConfigurationsHandler implements IQueryHandler<GetConfigurations, GetConfigurationsResponse> {
  constructor(
    @InjectRepository(ConfigurationEntity)
    private readonly configurations: ConfigurationRepository,
    private readonly extensionExplorer: ExplorerService,
  ) {}

  async execute(request: GetConfigurations): Promise<GetConfigurationsResponse> {
    const { enabled, user, withExtensions } = request;

    let entities = await this.configurations.find({
      where: { status: Not(ConfigurationStatus.DELETED) },
      order: {
        name: 'ASC',
      },
      relations: withExtensions ? ['extensions'] : [],
    });
    if (user.userGroupId !== BUILTIN_USER_GROUP_ADMIN) {
      entities = entities.filter(
        (e) => !e.userGroupsIds || e.userGroupsIds.length === 0 || e.userGroupsIds.indexOf(user.userGroupId) >= 0,
      );
    }

    if (enabled) {
      entities = entities.filter((e) => e.status === ConfigurationStatus.ENABLED);
    }

    const result = await Promise.all(entities.map((e) => buildConfiguration(e, this.extensionExplorer, withExtensions, enabled)));
    return new GetConfigurationsResponse(result);
  }
}
