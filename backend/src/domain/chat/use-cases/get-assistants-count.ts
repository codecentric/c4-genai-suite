import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { AssistantsCount, MessageEntity, MessageRepository } from '../../database';
import { GroupBy } from '../statistics';

export class GetAssistantsCount {
  constructor(
    public readonly since: Date | undefined,
    public readonly groupBy: GroupBy,
  ) {}
}

export class GetAssistantsCountResponse {
  constructor(public readonly result: AssistantsCount[]) {}
}

@QueryHandler(GetAssistantsCount)
export class GetAssistantsCountHandler implements IQueryHandler<GetAssistantsCount, GetAssistantsCountResponse> {
  constructor(
    @InjectRepository(MessageEntity)
    private readonly messages: MessageRepository,
  ) {}

  async execute(query: GetAssistantsCount): Promise<GetAssistantsCountResponse> {
    const result = await this.messages.getAssistantsCount(query.since, query.groupBy);
    return new GetAssistantsCountResponse(result);
  }
}
