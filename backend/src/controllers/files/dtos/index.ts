import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDefined, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Bucket, FileType, UploadedFile } from 'src/domain/files';
import { BucketType, FileSizeLimits, FileUploadStatus } from '../../../domain/database';

export class FileDto {
  @ApiProperty({
    description: 'The ID of the file.',
    required: true,
  })
  id!: number;

  @ApiProperty({
    description: 'The name of the file.',
    required: true,
  })
  fileName!: string;

  @ApiProperty({
    description: 'The size of the file in bytes.',
    required: true,
  })
  fileSize!: number;

  @ApiProperty({
    description: 'The mime type.',
    required: true,
  })
  mimeType!: string;

  @ApiProperty({
    description: 'The time when the file has been created',
    required: true,
  })
  uploadedAt!: Date;

  @ApiProperty({
    description: 'The status of the file upload to the RAG-Service',
    required: false,
    enum: ['successful', 'inProgress'],
  })
  uploadStatus!: FileUploadStatus;

  static fromDomain(this: void, source: UploadedFile) {
    const result = new FileDto();
    result.id = source.id;
    result.fileName = source.fileName;
    result.fileSize = source.fileSize;
    result.mimeType = source.mimeType;
    result.uploadedAt = source.uploadedAt;
    result.uploadStatus = source.uploadStatus;

    return result;
  }
}

export class FilesDto {
  @ApiProperty({
    description: 'The uploaded files.',
    required: true,
    type: [FileDto],
  })
  items!: FileDto[];

  @ApiProperty({
    description: 'The total number of files.',
    required: true,
  })
  total!: number;

  static fromDomain(source: UploadedFile[], total: number) {
    const result = new FilesDto();
    result.items = source.map(FileDto.fromDomain);
    result.total = total;

    return result;
  }
}

export class TestBucketDto {
  @ApiProperty({
    description: 'The URL to the RAG server.',
    required: true,
  })
  @IsDefined()
  @IsString()
  endpoint!: string;

  @ApiProperty({
    description: 'The optional headers.',
    required: true,
  })
  @IsOptional()
  @IsString()
  headers?: string;
}

export class UpsertBucketDto {
  @ApiProperty({
    description: 'The name of the bucket.',
    required: true,
  })
  @IsString()
  @IsDefined()
  name!: string;

  @ApiProperty({
    description: 'The URL to the RAG server.',
    required: true,
  })
  @IsDefined()
  @IsString()
  endpoint!: string;

  @ApiProperty({
    description: 'The optional index name.',
  })
  @IsOptional()
  @IsString()
  indexName?: string;

  @ApiProperty({
    description: 'The optional headers.',
    required: true,
  })
  @IsOptional()
  @IsString()
  headers?: string;

  @ApiProperty({
    description: 'Indicates whether the bucket is the user/default bucket.',
    required: true,
  })
  @IsDefined()
  @IsBoolean()
  isDefault!: boolean;

  @ApiProperty({
    description: 'The quota per user. Only relevant if the bucket is a user bucket/default bucket.',
    required: true,
  })
  @IsDefined()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  perUserQuota!: number;

  @ApiProperty({
    description: 'The allowed file types. Only relevant if the bucket is a user bucket/default bucket.',
    required: false,
    type: [String],
  })
  @Type(() => String)
  @IsArray()
  allowedFileNameExtensions?: string[];

  @ApiProperty({
    description: 'The bucket type.',
    required: false,
    enum: ['general', 'user', 'conversation'],
  })
  type!: BucketType;

  @ApiProperty({
    description: 'Size limits per file type in MB.',
    type: 'object',
    properties: {
      general: {
        type: 'number',
        example: '1.5',
      },
    },
    additionalProperties: { type: 'number' },
    required: ['general'],
    selfRequired: true,
  })
  fileSizeLimits!: FileSizeLimits;
}

export class BucketDto {
  @ApiProperty({
    description: 'The ID of the bucket.',
    required: true,
  })
  id!: number;

  @ApiProperty({
    description: 'The name of the bucket.',
    required: true,
  })
  name!: string;

  @ApiProperty({
    description: 'The URL to the RAG server.',
    required: true,
  })
  endpoint!: string;

  @ApiProperty({
    description: 'The index name',
  })
  indexName?: string;

  @ApiProperty({
    description: 'The optional headers.',
    required: true,
  })
  headers?: string;

  @ApiProperty({
    description: 'Indicates whether the bucket is the user/default bucket.',
    required: true,
  })
  isDefault!: boolean;

  @ApiProperty({
    description: 'The quota per user. Only relevant if the bucket is a user bucket/default bucket.',
    required: true,
  })
  perUserQuota!: number;

  @ApiProperty({
    description: 'The allowed file types. Only relevant if the bucket is a user bucket/default bucket.',
    required: false,
    type: [String],
  })
  @Type(() => String)
  @IsArray()
  allowedFileNameExtensions?: string[];

  @ApiProperty({
    description: 'The bucket type.',
    required: false,
    enum: ['general', 'user', 'conversation'],
  })
  type!: BucketType;

  @ApiProperty({
    description: 'Size limits per file type in MB.',
    type: 'object',
    properties: {
      general: {
        type: 'number',
        example: '1.5',
      },
    },
    additionalProperties: { type: 'number' },
    required: ['general'],
    selfRequired: true,
  })
  fileSizeLimits!: FileSizeLimits;

  static fromDomain(this: void, source: Bucket) {
    const result = new BucketDto();
    result.endpoint = source.endpoint;
    result.indexName = source.indexName;
    result.headers = source.headers;
    result.id = source.id;
    result.isDefault = source.isDefault;
    result.perUserQuota = source.perUserQuota;
    result.name = source.name;
    result.allowedFileNameExtensions = source.allowedFileNameExtensions;
    result.type = source.type;
    result.fileSizeLimits = source.fileSizeLimits;

    return result;
  }
}

export class BucketsDto {
  @ApiProperty({
    description: 'The configured buckets.',
    required: true,
    type: [BucketDto],
  })
  items!: BucketDto[];

  static fromDomain(source: Bucket[]) {
    const result = new BucketsDto();
    result.items = source.map(BucketDto.fromDomain);

    return result;
  }
}

export class FileTypeDto {
  @ApiProperty({
    description: 'The value of the file type.',
    required: true,
  })
  value!: string;

  @ApiProperty({
    description: 'The label of the file type.',
    required: true,
  })
  label!: string;

  static fromDomain(this: void, source: FileType) {
    const result = new FileTypeDto();
    result.value = source.value;
    result.label = source.label;
    return result;
  }
}

export class FileTypesDto {
  @ApiProperty({
    description: 'The files types.',
    required: true,
    type: [FileTypeDto],
  })
  items!: FileTypeDto[];

  static fromDomain(source: FileType[]) {
    const result = new FileTypesDto();
    result.items = source.map(FileTypeDto.fromDomain);

    return result;
  }
}
