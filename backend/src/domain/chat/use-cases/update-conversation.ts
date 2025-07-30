import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { ConversationEntity, ConversationRepository, MessageEntity, MessageRepository } from 'src/domain/database';
import { GetConfigurations, GetConfigurationsResponse } from 'src/domain/extensions';
import { User } from 'src/domain/users';
import { assignDefined } from 'src/lib';
import { Conversation } from '../interfaces';

type Values = Partial<
  Pick<Conversation, 'context' | 'extensionUserArguments' | 'configurationId' | 'llm' | 'name' | 'isNameSetManually' | 'rating'>
>;

export class UpdateConversation {
  constructor(
    public readonly id: number,
    public readonly user: User,
    public readonly values: Values,
  ) {}
}

export class UpdateConversationResponse {
  constructor(public readonly conversation: Conversation) {}
}

@CommandHandler(UpdateConversation)
export class UpdateConversationHandler implements ICommandHandler<UpdateConversation, UpdateConversationResponse> {
  constructor(
    private readonly queryBus: QueryBus,
    @InjectRepository(ConversationEntity)
    private readonly conversations: ConversationRepository,
    @InjectRepository(MessageEntity)
    private readonly messages: MessageRepository,
  ) {}

  async execute(command: UpdateConversation): Promise<any> {
    const { id, user, values } = command;
    const { context, extensionUserArguments, configurationId, llm, name, isNameSetManually, rating } = values;

    // We need the actual conversation for the following validations.
    const entity = await this.conversations.findOneBy({ id });

    if (!entity) {
      throw new NotFoundException();
    }

    if (entity.userId !== user.id) {
      throw new ForbiddenException();
    }

    if (configurationId) {
      const { configurations }: GetConfigurationsResponse = await this.queryBus.execute(new GetConfigurations(user, true));
      const configuration = configurations.find((x) => x.id === configurationId);

      if (!configuration) {
        throw new BadRequestException('Configuration does not exist.');
      }

      if (!configuration.enabled) {
        throw new BadRequestException('Configuration is not enabled.');
      }
    }

    if (context) {
      if (entity.context) {
        assignDefined(entity.context, context);
      } else {
        entity.context = context;
      }
    }

    if (extensionUserArguments) {
      if (entity.extensionUserArguments) {
        assignDefined(entity.extensionUserArguments, extensionUserArguments);
      } else {
        entity.extensionUserArguments = extensionUserArguments;
      }
    }

    // Assign the object manually to avoid updating unexpected values.
    assignDefined(entity, { configurationId: configurationId, llm, name, isNameSetManually, rating });

    // Use the save method otherwise we would not get previous values.
    const updated = await this.conversations.save(entity);
    return new UpdateConversationResponse(updated);
  }
}
