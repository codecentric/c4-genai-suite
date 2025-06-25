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
    description: 'Uri or id of the chunk',
    example: 's5q-chunk://{chunkId})',
    required: false,
    type: 'string',
  })
  @IsString()
  @IsOptional()
  uri?: string | null;

  @ApiProperty({ description: 'Text representation of the chunk', required: true, type: 'string' })
  @IsString()
  content!: string;

  @ApiProperty({ description: 'Page reference, if applicable', required: false, type: [Number] })
  @IsNumber({}, { each: true })
  @IsArray()
  @IsOptional()
  pages?: number[] | null;
}

export class DocumentDto {
  @ApiProperty({
    description: 'Uri or id of the document',
    example: 's5q-document://{documentId}',
    required: true,
  })
  @IsString()
  uri!: string;

  @ApiProperty({ description: 'Name of the document', required: false, type: 'string' })
  @IsString()
  @IsOptional()
  name?: string | null;

  @ApiProperty({ description: 'MIME type of the document', example: 'application/pdf', required: true, type: 'string' })
  @IsString()
  mimeType!: string;

  @ApiProperty({ description: 'Size of the document in bytes', required: false, type: 'number' })
  @IsNumber()
  @IsOptional()
  size?: number | null;

  @ApiProperty({ description: 'Link to the document, if available', required: false, type: 'string' })
  @IsString()
  @IsOptional()
  link?: string | null;
}

export class SourceDto {
  @ApiProperty({ description: 'The title of the source.', required: true, type: 'string' })
  @IsString()
  title!: string; // title of the source document

  @ApiProperty({ description: 'Chunk information', required: true, type: ChunkDto })
  @Type(() => ChunkDto)
  @ValidateNested()
  chunk!: ChunkDto;

  @ApiProperty({ description: 'Document information', required: false, type: DocumentDto })
  @Type(() => DocumentDto)
  @ValidateNested()
  @IsOptional()
  document?: DocumentDto | null;

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
