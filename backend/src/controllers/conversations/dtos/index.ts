import { ApiExtraModels, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { IsBoolean, IsDefined, IsEnum, IsIn, IsNumber, IsObject, IsOptional, IsString } from 'class-validator';
import { MessageContentDto, MessageContentImageUrlDto, MessageContentTextDto, SourceDto } from 'src/controllers/shared';
import {
  Conversation,
  CONVERSATION_RATINGS,
  ConversationRating,
  FormActionType,
  Message,
  MESSAGE_RATINGS,
  MESSAGE_TYPES,
  MessageRating,
  MessageType,
  NormalizedMessageContents,
  StreamEvent,
} from 'src/domain/chat';
import { ExtensionArgumentObjectSpecDto } from '../../extensions/dtos';
import { FileDto } from '../../files/dtos';

export class ChatUICallbackResultDto {
  @ApiProperty({
    description: 'The action taken in the form.',
    required: true,
    enum: FormActionType,
  })
  @IsEnum(FormActionType)
  action!: FormActionType;

  @ApiProperty({
    description: 'Additional data related to the action.',
    required: false,
    type: Object,
  })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}

export class RateMessageDto {
  @ApiProperty({
    description: 'The rating.',
    required: true,
    enum: MESSAGE_RATINGS,
  })
  @IsDefined()
  @IsIn(MESSAGE_RATINGS)
  rating!: MessageRating;
}

@ApiExtraModels(MessageContentTextDto, MessageContentImageUrlDto)
export class MessageDto {
  @ApiProperty({
    description: 'The ID of the message.',
    required: true,
  })
  id!: number;

  @ApiProperty({
    description: 'The content.',
    required: true,
    type: 'array',
    items: MessageContentDto,
  })
  content!: NormalizedMessageContents;

  @ApiProperty({
    description: 'The type.',
    required: true,
    enum: MESSAGE_TYPES,
  })
  type!: MessageType;

  @ApiProperty({
    description: 'The rating.',
    required: false,
    enum: MESSAGE_RATINGS,
  })
  rating?: MessageRating;

  @ApiProperty({
    description: 'The executed tools.',
    required: false,
    type: [String],
  })
  tools?: string[];

  @ApiProperty({
    description: 'The debug records.',
    required: false,
    type: [String],
  })
  debug?: string[];

  @ApiProperty({
    description: 'The source records.',
    required: false,
    isArray: true,
    type: SourceDto,
  })
  sources?: SourceDto[];

  @ApiProperty({
    description: 'The logging information.',
    required: false,
    type: [String],
  })
  logging?: string[];

  static fromDomain(this: void, source: Message) {
    const result = new MessageDto();
    result.id = source.id;
    result.content = source.content;
    result.debug = source.debug;
    result.sources = source.sources;
    result.rating = source.rating;
    result.tools = source.tools;
    result.type = source.type;
    result.logging = source.logging;

    return result;
  }
}

export class MessagesDto {
  @ApiProperty({
    description: 'The mesages.',
    required: true,
    type: [MessageDto],
  })
  items!: MessageDto[];

  static fromDomain(source: Message[]) {
    const result = new MessagesDto();
    result.items = source.map(MessageDto.fromDomain).filter((x) => !!x);

    return result;
  }
}

export type ConversationContextDto = Record<string, string>;

export type ExtensionUserArgumentsDto = Record<string, Record<string, string>>;

export class CreateConversationDto {
  @ApiProperty({
    description: 'The name of the conversation.',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'The ID of the configuration.',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  configurationId?: number;

  @ApiProperty({
    description: 'The context values.',
    required: false,
  })
  @IsOptional()
  @IsObject()
  context?: ConversationContextDto;

  @ApiProperty({
    description: 'The user argument values.',
    required: false,
  })
  @IsOptional()
  @IsObject()
  extensionUserArguments?: ExtensionUserArgumentsDto;
}

export class SendMessageDto {
  @ApiProperty({
    required: true,
  })
  @IsString()
  query!: string;

  @ApiProperty({
    description: 'The files.',
    required: false,
    isArray: true,
    type: FileDto,
  })
  files?: FileDto[];
}

export class UpdateConversationDto {
  @ApiProperty({
    description: 'The ID of the configuration.',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  configurationId?: number;

  @ApiProperty({
    description: 'The name of the conversation.',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Indicates whether the name of the conversation has been set manually by the user.',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isNameSetManually?: boolean;

  @ApiProperty({
    description: 'The context values.',
    required: false,
  })
  @IsOptional()
  @IsObject()
  context?: ConversationContextDto;

  @ApiProperty({
    description: 'The argument values.',
    required: false,
  })
  @IsOptional()
  @IsObject()
  extensionUserArguments?: ExtensionUserArgumentsDto;

  @ApiProperty({
    description: 'The optional rating for the whole conversation.',
    required: false,
    enum: CONVERSATION_RATINGS,
  })
  @IsOptional()
  @IsIn(CONVERSATION_RATINGS)
  rating?: ConversationRating;
}

export class ConversationDto {
  @ApiProperty({
    description: 'The ID of the conversation.',
    required: true,
  })
  id!: number;

  @ApiProperty({
    description: 'The name, which is usually a summary of the conversation.',
    required: false,
  })
  name?: string;

  @ApiProperty({
    description: 'The ID of the configuration.',
    required: true,
  })
  configurationId!: number;

  @ApiProperty({
    description: 'The optional rating for the whole conversation.',
    required: false,
    enum: CONVERSATION_RATINGS,
  })
  rating?: ConversationRating;

  @ApiProperty({
    description: 'The creation time.',
    required: true,
    type: String,
    format: 'date',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'The context values.',
    required: false,
  })
  @IsOptional()
  @IsObject()
  context?: ConversationContextDto;

  @ApiProperty({
    description: 'The argument values.',
    required: false,
  })
  @IsOptional()
  @IsObject()
  extensionUserArguments?: ExtensionUserArgumentsDto;

  static fromDomain(this: void, source: Conversation) {
    const result = new ConversationDto();
    result.id = source.id;
    result.createdAt = source.createdAt;
    result.configurationId = source.configurationId;
    result.name = source.name;
    result.rating = source.rating;
    result.context = source.context;
    result.extensionUserArguments = source.extensionUserArguments;

    return result;
  }
}

export class ConversationsDto {
  @ApiProperty({
    description: 'The conversations.',
    required: true,
    type: [ConversationDto],
  })
  items!: ConversationDto[];

  static fromDomain(source: Conversation[]) {
    const result = new ConversationsDto();
    result.items = source.map(ConversationDto.fromDomain);

    return result;
  }
}

export class StreamToolInfoDto {
  @ApiProperty({
    description: 'The name of the tool.',
    required: true,
  })
  name!: string;
}

export class StreamUIRequestDto {
  @ApiProperty({
    description: 'The ID to confirm the request.',
    required: true,
  })
  id!: string;

  @ApiProperty({
    description: 'The text for the confirm dialog.',
    required: true,
  })
  text!: string;

  @ApiProperty({
    description: 'The schema.',
    required: true,
    type: ExtensionArgumentObjectSpecDto,
  })
  schema!: ExtensionArgumentObjectSpecDto;
}

export class StreamMetadataDto {
  @ApiProperty({
    description: 'The total token count.',
    required: true,
  })
  tokenCount!: number;
}

export class StreamStartMetadataDto {
  @ApiProperty({
    description: 'The conversation ID.',
    required: true,
  })
  conversationId!: number;
}

export class StreamTokenEventDto {
  static TYPE_NAME = 'chunk';

  @ApiProperty({
    description: 'The content.',
    required: true,
    type: 'array',
    items: MessageContentDto,
  })
  content!: NormalizedMessageContents;

  @ApiProperty({
    enum: [StreamTokenEventDto.TYPE_NAME],
  })
  type!: typeof StreamTokenEventDto.TYPE_NAME;
}

export class StreamErrorEventDto {
  static TYPE_NAME = 'error';

  @ApiProperty({
    description: 'The error message.',
    required: true,
  })
  message!: string;

  @ApiProperty({
    enum: [StreamErrorEventDto.TYPE_NAME],
  })
  type!: typeof StreamErrorEventDto.TYPE_NAME;
}

export class StreamToolStartEventDto {
  static TYPE_NAME = 'tool_start';

  @ApiProperty({
    description: 'The tool info.',
    required: true,
    type: StreamToolInfoDto,
  })
  tool!: StreamToolInfoDto;

  @ApiProperty({
    enum: [StreamToolStartEventDto.TYPE_NAME],
  })
  type!: typeof StreamToolStartEventDto.TYPE_NAME;
}

export class StreamToolEndEventDto {
  static TYPE_NAME = 'tool_end';

  @ApiProperty({
    description: 'The tool info.',
    required: true,
    type: StreamToolInfoDto,
  })
  tool!: StreamToolInfoDto;

  @ApiProperty({
    enum: [StreamToolEndEventDto.TYPE_NAME],
  })
  type!: typeof StreamToolEndEventDto.TYPE_NAME;
}

export class StreamMessageSavedDto {
  static TYPE_NAME = 'saved';

  @ApiProperty({
    description: 'The message ID.',
    required: true,
  })
  messageId!: number;

  @ApiProperty({
    description: 'The type.',
    required: true,
    enum: MESSAGE_TYPES,
  })
  messageType!: MessageType;

  @ApiProperty({
    enum: [StreamMessageSavedDto.TYPE_NAME],
  })
  type!: typeof StreamMessageSavedDto.TYPE_NAME;
}

export class StreamSummaryDto {
  static TYPE_NAME = 'summary';

  @ApiProperty({
    description: 'The summary .',
    required: true,
  })
  content!: string;

  @ApiProperty({
    enum: [StreamSummaryDto.TYPE_NAME],
  })
  type!: typeof StreamSummaryDto.TYPE_NAME;
}

export class StreamDebugEvent {
  static TYPE_NAME = 'debug';

  @ApiProperty({
    description: 'The debug information.',
    required: true,
  })
  content!: string;

  @ApiProperty({
    enum: [StreamDebugEvent.TYPE_NAME],
  })
  type!: typeof StreamDebugEvent.TYPE_NAME;
}

export class StreamSourcesEvent {
  static TYPE_NAME = 'sources';

  @ApiProperty({
    description: 'The sources information.',
    required: true,
    isArray: true,
    type: SourceDto,
  })
  content!: SourceDto[];

  @ApiProperty({
    enum: [StreamSourcesEvent.TYPE_NAME],
  })
  type!: typeof StreamSourcesEvent.TYPE_NAME;
}

export class StreamLoggingEvent {
  static TYPE_NAME = 'logging';

  @ApiProperty({
    description: 'The logging information.',
    required: true,
  })
  content!: string;

  @ApiProperty({
    enum: [StreamLoggingEvent.TYPE_NAME],
  })
  type!: typeof StreamLoggingEvent.TYPE_NAME;
}

export class StreamUIEventDto {
  static TYPE_NAME = 'ui';

  @ApiProperty({
    description: 'The request.',
    required: true,
    type: StreamUIRequestDto,
  })
  request!: StreamUIRequestDto;

  @ApiProperty({
    enum: [StreamUIEventDto.TYPE_NAME],
  })
  type!: typeof StreamUIEventDto.TYPE_NAME;
}

export class StreamCompletedEventDto {
  static TYPE_NAME = 'completed';

  @ApiProperty({
    description: 'The metadata about the request.',
    required: true,
    type: StreamMetadataDto,
  })
  metadata!: StreamMetadataDto;

  @ApiProperty({
    enum: [StreamCompletedEventDto.TYPE_NAME],
  })
  type!: typeof StreamCompletedEventDto.TYPE_NAME;
}

@ApiExtraModels(
  StreamCompletedEventDto,
  StreamDebugEvent,
  StreamSourcesEvent,
  StreamLoggingEvent,
  StreamErrorEventDto,
  StreamMessageSavedDto,
  StreamTokenEventDto,
  StreamToolEndEventDto,
  StreamToolStartEventDto,
  StreamUIEventDto,
  StreamSummaryDto,
)
export class StreamEventHolderDto {
  @ApiProperty({
    title: 'StreamEventDto',
    oneOf: [
      { $ref: getSchemaPath(StreamCompletedEventDto) },
      { $ref: getSchemaPath(StreamDebugEvent) },
      { $ref: getSchemaPath(StreamSourcesEvent) },
      { $ref: getSchemaPath(StreamLoggingEvent) },
      { $ref: getSchemaPath(StreamErrorEventDto) },
      { $ref: getSchemaPath(StreamMessageSavedDto) },
      { $ref: getSchemaPath(StreamSummaryDto) },
      { $ref: getSchemaPath(StreamTokenEventDto) },
      { $ref: getSchemaPath(StreamToolEndEventDto) },
      { $ref: getSchemaPath(StreamToolStartEventDto) },
      { $ref: getSchemaPath(StreamUIEventDto) },
    ],
    discriminator: {
      propertyName: 'type',
      mapping: {
        [StreamCompletedEventDto.TYPE_NAME]: getSchemaPath(StreamCompletedEventDto),
        [StreamDebugEvent.TYPE_NAME]: getSchemaPath(StreamDebugEvent),
        [StreamSourcesEvent.TYPE_NAME]: getSchemaPath(StreamSourcesEvent),
        [StreamLoggingEvent.TYPE_NAME]: getSchemaPath(StreamLoggingEvent),
        [StreamErrorEventDto.TYPE_NAME]: getSchemaPath(StreamErrorEventDto),
        [StreamMessageSavedDto.TYPE_NAME]: getSchemaPath(StreamMessageSavedDto),
        [StreamSummaryDto.TYPE_NAME]: getSchemaPath(StreamSummaryDto),
        [StreamTokenEventDto.TYPE_NAME]: getSchemaPath(StreamTokenEventDto),
        [StreamToolEndEventDto.TYPE_NAME]: getSchemaPath(StreamToolEndEventDto),
        [StreamToolStartEventDto.TYPE_NAME]: getSchemaPath(StreamToolStartEventDto),
        [StreamUIEventDto.TYPE_NAME]: getSchemaPath(StreamUIEventDto),
      },
    },
  })
  public event!: StreamEvent;
}
