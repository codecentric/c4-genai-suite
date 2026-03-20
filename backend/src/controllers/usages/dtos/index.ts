import { ApiProperty } from '@nestjs/swagger';
import { Rating, Usage } from 'src/domain/chat/use-cases';

import { AssistantsCount, MessagesCount, UsagesCount } from '../../../domain/database';

export class UsageDto {
  @ApiProperty({
    description: 'The date key.',
    required: true,
    type: String,
    format: 'date',
  })
  date!: Date;

  @ApiProperty({
    description: 'The total number of tokens.',
    required: true,
  })
  total!: number;

  @ApiProperty({
    description: 'The usage per llm and model.',
    required: true,
    additionalProperties: {
      type: 'number',
    },
  })
  byModel!: Record<string, number>;

  static fromDomain(this: void, source: Usage) {
    const result = new UsageDto();
    result.date = source.date;
    result.byModel = source.byModel;
    result.total = source.total;

    return result;
  }
}

export class UsagesDto {
  @ApiProperty({
    description: 'The usage items.',
    required: true,
    type: [UsageDto],
  })
  items!: UsageDto[];

  static fromDomain(source: Usage[]) {
    const result = new UsagesDto();
    result.items = source.map(UsageDto.fromDomain);

    return result;
  }
}

export class RatingDto {
  @ApiProperty({
    description: 'The date key.',
    required: true,
    type: String,
    format: 'date',
  })
  date!: Date;

  @ApiProperty({
    description: 'The total number of ratings.',
    required: true,
  })
  total!: number;

  @ApiProperty({
    description: 'The ratings per type.',
    required: true,
    additionalProperties: {
      type: 'number',
    },
  })
  byCategory!: Record<string, number>;

  static fromDomain(this: void, source: Rating) {
    const result = new RatingDto();
    result.date = source.date;
    result.byCategory = source.byCategory;
    result.total = source.total;

    return result;
  }
}

export class RatingsDto {
  @ApiProperty({
    description: 'The ratings items.',
    required: true,
    type: [RatingDto],
  })
  items!: RatingDto[];

  static fromDomain(source: Rating[]) {
    const result = new RatingsDto();
    result.items = source.map(RatingDto.fromDomain);

    return result;
  }
}

export class MessagesCountDto {
  @ApiProperty({
    description: 'The date key.',
    required: true,
    type: String,
    format: 'date',
  })
  date!: Date;

  @ApiProperty({
    description: 'The total number of messages.',
    required: true,
  })
  total!: number;

  static fromDomain(this: void, source: MessagesCount) {
    const result = new MessagesCountDto();
    result.date = source.date;
    result.total = source.total;

    return result;
  }
}

export class MessagesCountsDto {
  @ApiProperty({
    description: 'The messages count items.',
    required: true,
    type: [MessagesCountDto],
  })
  items!: MessagesCountDto[];

  static fromDomain(source: MessagesCount[]) {
    const result = new MessagesCountsDto();
    result.items = source.map(MessagesCountDto.fromDomain);

    return result;
  }
}

export class UsersCountDto {
  @ApiProperty({
    description: 'The date key.',
    required: true,
    type: String,
    format: 'date',
  })
  date!: Date;

  @ApiProperty({
    description: 'The total number of users.',
    required: true,
  })
  total!: number;

  static fromDomain(this: void, source: UsagesCount) {
    const result = new UsersCountDto();
    result.date = source.date;
    result.total = source.total;

    return result;
  }
}

export class UsersCountsDto {
  @ApiProperty({
    description: 'The user count items.',
    required: true,
    type: [UsersCountDto],
  })
  items!: UsersCountDto[];

  static fromDomain(source: UsersCountDto[]) {
    const result = new UsersCountsDto();
    result.items = source.map(UsersCountDto.fromDomain);

    return result;
  }
}

export class AssistantsCountDto {
  @ApiProperty({
    description: 'The date key.',
    required: true,
    type: String,
    format: 'date',
  })
  date!: Date;

  @ApiProperty({
    description: 'The total number of assistant requests.',
    required: true,
  })
  total!: number;

  @ApiProperty({
    description: 'The requests per assistant.',
    required: true,
    additionalProperties: {
      type: 'number',
    },
  })
  byAssistant!: Record<string, number>;

  static fromDomain(this: void, source: AssistantsCount) {
    const result = new AssistantsCountDto();
    result.date = source.date;
    result.total = source.total;
    result.byAssistant = source.byAssistant;

    return result;
  }
}

export class AssistantsCountsDto {
  @ApiProperty({
    description: 'The assistant count items.',
    required: true,
    type: [AssistantsCountDto],
  })
  items!: AssistantsCountDto[];

  static fromDomain(source: AssistantsCount[]) {
    const result = new AssistantsCountsDto();
    result.items = source.map(AssistantsCountDto.fromDomain);

    return result;
  }
}
