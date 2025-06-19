import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { Type } from 'class-transformer';
import { IsArray, IsDefined, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

export class ImageUrlDto {
  @ApiProperty({
    description: 'The image URL. Usually a base64 encoded image.',
    required: true,
  })
  public url!: string;
}

export class ChatSuggestionDto {
  @ApiProperty({
    description: 'The title.',
    required: true,
  })
  @IsDefined()
  @IsString()
  public title!: string;

  @ApiProperty({
    description: 'The subtitle.',
    required: true,
  })
  @IsDefined()
  @IsString()
  public subtitle!: string;

  @ApiProperty({
    description: 'The text to copy.',
    required: true,
  })
  @IsDefined()
  @IsString()
  public text!: string;
}

export class SiteLinkDto {
  @ApiProperty({
    description: 'The link.',
    required: true,
  })
  @IsDefined()
  @IsString()
  public link!: string;

  @ApiProperty({
    description: 'The text.',
    required: true,
  })
  @IsDefined()
  @IsString()
  public text!: string;
}

export class MessageContentTextDto {
  static TYPE_NAME = 'text';

  @ApiProperty({
    description: 'The content as text.',
    required: true,
  })
  public text!: string;

  @ApiProperty({
    enum: [MessageContentTextDto.TYPE_NAME],
  })
  public type!: typeof MessageContentTextDto.TYPE_NAME;
}

export class MessageContentImageUrlDto {
  static TYPE_NAME = 'image_url';

  @ApiProperty({
    description: 'The content as image.',
    required: true,
    type: ImageUrlDto,
  })
  public image!: ImageUrlDto;

  @ApiProperty({
    enum: [MessageContentImageUrlDto.TYPE_NAME],
  })
  public type!: typeof MessageContentImageUrlDto.TYPE_NAME;
}

export const MessageContentDto: SchemaObject = {
  title: 'MessageContentDto',
  oneOf: [
    {
      $ref: getSchemaPath(MessageContentTextDto),
    },
    {
      $ref: getSchemaPath(MessageContentImageUrlDto),
    },
  ],
  discriminator: {
    propertyName: 'type',
    mapping: {
      [MessageContentTextDto.TYPE_NAME]: getSchemaPath(MessageContentTextDto),
      [MessageContentImageUrlDto.TYPE_NAME]: getSchemaPath(MessageContentImageUrlDto),
    },
  },
};

export class ChunkDto {
  @ApiProperty({
    description: 'URI of the chunk (e.g., s5q-chunk://{chunkId}) or an id',
    nullable: true,
    required: false,
    type: 'string',
  })
  @IsString()
  uri?: string | null;

  @ApiProperty({ description: 'Text representation of the chunk', required: true })
  @IsString()
  content!: string;

  @ApiProperty({ description: 'MIME type of the chunk (e.g., text/plain)', required: true })
  @IsString()
  mimeType!: string;

  @ApiProperty({ description: 'Page reference, if applicable', nullable: true, required: false, type: [Number] })
  @IsNumber()
  @IsArray()
  @IsOptional()
  pages?: number[] | null;
}

export class DocumentDto {
  @ApiProperty({
    description: 'URI of the document (e.g., s5q-document://{documentId}) or an id',
    nullable: true,
    required: false,
    type: 'string',
  })
  @IsString()
  uri?: string | null;

  @ApiProperty({ description: 'Name of the document', nullable: true, required: false, type: 'string' })
  @IsString()
  name?: string | null;

  @ApiProperty({ description: 'MIME type of the document (e.g., application/pdf)', required: true })
  @IsString()
  mimeType!: string;

  @ApiProperty({ description: 'Size of the document in bytes', nullable: true, required: false, type: 'number' })
  @IsNumber()
  @IsOptional()
  size?: number | null;

  @ApiProperty({ description: 'Link to the document, if available', nullable: true, required: false, type: 'string' })
  @IsString()
  @IsOptional()
  link?: string | null;
}

export class SourceDto {
  @ApiProperty({ description: 'The title of the source.', required: true })
  @IsString()
  title!: string; // title of the source document

  //sourceEndpoint!: string; // 'http://sherloq-cccc/sse'
  // or
  @ApiProperty({ description: 'Extension name for retrieving chunks or documents', required: true })
  @IsNumber()
  extensionExternalId!: string; // --> Extension.getChunks(uri: string[]); Extension.getDocument(uri: string)

  @ApiProperty({ description: 'Chunk information', required: true })
  @Type(() => ChunkDto)
  @ValidateNested()
  chunk!: ChunkDto;

  @ApiProperty({ description: 'Document information', required: true })
  @Type(() => DocumentDto)
  @ValidateNested()
  document!: DocumentDto;

  @ApiProperty({
    description: 'Additional metadata about the source.',
    type: 'object',
    additionalProperties: true,
    selfRequired: false,
  })
  metadata?: Record<string, any> | null;
}

interface ParseDatePipeOptions {
  optional?: boolean;
  defaultDate?: Date;
  errorMessage?: string;
}

@Injectable()
export class ParseDatePipe implements PipeTransform {
  private readonly optional: boolean;
  private readonly defaultDate?: Date;
  private readonly errorMessage: string;

  constructor(options: ParseDatePipeOptions = {}) {
    this.optional = options.optional ?? false;
    this.defaultDate = options.defaultDate;
    this.errorMessage = options.errorMessage ?? 'Invalid date format. Please provide a valid date.';
  }

  transform(value: string | undefined) {
    // Handle optional dates
    if (!value) {
      if (this.optional) {
        return this.defaultDate ?? undefined;
      }
      throw new BadRequestException('Date is required');
    }

    // Parse and validate the date
    const parsedDate = new Date(value);
    if (isNaN(parsedDate.getTime())) {
      throw new BadRequestException(this.errorMessage);
    }

    return parsedDate;
  }
}
