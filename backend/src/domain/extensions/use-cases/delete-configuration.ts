import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult } from 'typeorm';
import { ConfigurationEntity, ConfigurationRepository, ConfigurationStatus } from 'src/domain/database';
import { assignDefined } from 'src/lib';

export class DeleteConfiguration {
  constructor(public readonly id: number) {}
}

@CommandHandler(DeleteConfiguration)
export class DeleteConfigurationHandler implements ICommandHandler<DeleteConfiguration, any> {
  constructor(
    @InjectRepository(ConfigurationEntity)
    private readonly configurations: ConfigurationRepository,
  ) {}

  async execute(command: DeleteConfiguration): Promise<any> {
    let result: DeleteResult;
    const { id } = command;

    // So, we first try to just delete the configuration.
    try {
      result = await this.configurations.delete({ id: id });

      if (!result.affected) {
        throw new NotFoundException();
      }
    } catch (_error) {
      // If it does not work, because there are still messages referring to them, we mark the configuration as deleted.
      // That will only have the effect that the configuration will not be shown in any user facing menu,
      // but is still available for the existing messages to show needed information.
      const entity = await this.configurations.findOne({
        where: { id },
      });

      if (!entity) {
        throw new NotFoundException();
      }

      assignDefined(entity, {
        status: ConfigurationStatus.DELETED,
      });

      await this.configurations.save(entity);
    }
  }
}
