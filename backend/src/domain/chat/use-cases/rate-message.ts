import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ConversationEntity,
  ConversationRepository,
  MessageEntity,
  MessageRepository,
  trackUsage,
  UsageEntity,
  UsageRepository,
} from 'src/domain/database';
import { User } from 'src/domain/users';
import { MessageRating } from '../interfaces';

export class RateMessage {
  constructor(
    public readonly conversationId: number,
    public readonly messageId: number,
    public readonly user: User,
    public readonly rating: MessageRating,
  ) {}
}

export class RateMessageResponse {}

@CommandHandler(RateMessage)
export class RateMessageHandler implements ICommandHandler<RateMessage, RateMessageResponse> {
  constructor(
    @InjectRepository(ConversationEntity)
    private readonly conversations: ConversationRepository,
    @InjectRepository(MessageEntity)
    private readonly messages: MessageRepository,
    @InjectRepository(UsageEntity)
    private readonly usages: UsageRepository,
  ) {}

  async execute(command: RateMessage): Promise<RateMessageResponse> {
    const { conversationId, messageId, rating, user } = command;

    const conversation = await this.conversations.findOneBy({ id: conversationId });

    if (!conversation) {
      throw new NotFoundException();
    }

    if (conversation.userId !== user.id) {
      throw new ForbiddenException();
    }

    await this.messages.update({ id: messageId, conversationId }, { rating });

    await trackUsage(this.usages, {
      count: 1,
      counter: 'rating',
      date: new Date(),
      key: rating,
      subKey: conversation.llm || 'none',
      userId: user.id,
    });

    return new RateMessageResponse();
  }
}
