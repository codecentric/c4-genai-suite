import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, Not } from 'typeorm';
import {
  ConfigurationEntity,
  ConfigurationRepository,
  ConfigurationStatus,
  ConversationEntity,
  ConversationRepository,
} from 'src/domain/database';
import { assignDefined } from 'src/lib';
import { I18nService } from 'src/localization/i18n.service';

export class DeleteConfiguration {
  constructor(public readonly id: number) {}
}

@CommandHandler(DeleteConfiguration)
export class DeleteConfigurationHandler implements ICommandHandler<DeleteConfiguration, any> {
  constructor(
    private readonly i18n: I18nService,
    @InjectRepository(ConfigurationEntity)
    private readonly configurations: ConfigurationRepository,
    @InjectRepository(ConversationEntity)
    private readonly conversations: ConversationRepository,
  ) {}

  async execute(command: DeleteConfiguration): Promise<any> {
    let result: DeleteResult;
    const { id } = command;

    // So, we first try to just delete the configuration, which works it it was never used.
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
        relations: ['conversations'],
      });

      if (!entity) {
        throw new NotFoundException();
      }

      // For conversations which have this assistant as the active one, we need to supply a replacement.
      // We will just use the first enabled assistant. If the user tries to delete the last one, we show an error.
      const replacement = await this.configurations.findOne({
        where: { id: Not(id), status: ConfigurationStatus.ENABLED },
        order: { id: 'ASC' },
      });

      if (!replacement) {
        throw new BadRequestException(this.i18n.t('texts.chat.errorLastConfigurationdDeleted'));
      }

      if (entity.conversations) {
        for (const conversation of entity.conversations) {
          conversation.configuration = replacement;
          await this.conversations.save(conversation);
        }
      }

      assignDefined(entity, {
        status: ConfigurationStatus.DELETED,
        conversations: [],
      });

      await this.configurations.save(entity);
    }
  }
}
