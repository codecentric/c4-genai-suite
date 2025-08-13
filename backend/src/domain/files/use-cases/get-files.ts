import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, FindOptionsWhere, In, Raw } from 'typeorm';
import { BucketEntity, BucketRepository, BucketType, FileEntity, FileRepository } from 'src/domain/database';
import { User } from 'src/domain/users';
import { UploadedFile } from '../interfaces';
import { buildFile } from './utils';

function isBucketType(bucketIdOrType: number | BucketType): bucketIdOrType is BucketType {
  return typeof bucketIdOrType === 'string';
}

export class GetFiles {
  constructor(
    public readonly data: {
      user: User;
      bucketIdOrType: number | BucketType;
      page: number;
      pageSize?: number;
      query?: string;
      conversationId?: number;
      files?: number[];
      withContent?: boolean;
    },
  ) {}
}

export class GetFilesResponse {
  constructor(
    public readonly files: UploadedFile[],
    public readonly total: number,
  ) {}
}

@QueryHandler(GetFiles)
export class GetFilesHandler implements IQueryHandler<GetFiles, GetFilesResponse> {
  constructor(
    @InjectRepository(BucketEntity)
    private readonly buckets: BucketRepository,
    @InjectRepository(FileEntity)
    private readonly files: FileRepository,
  ) {}

  async execute(query: GetFiles): Promise<GetFilesResponse> {
    const { page, pageSize, query: searchQuery, bucketIdOrType, user, conversationId, files, withContent } = query.data;

    const where: FindOptionsWhere<FileEntity> = {};
    const bucketWhere: FindOptionsWhere<BucketEntity> = {};
    if (!conversationId) {
      if (isBucketType(bucketIdOrType)) {
        bucketWhere.type = bucketIdOrType;
      } else {
        bucketWhere.id = bucketIdOrType;
      }
      const bucket = await this.buckets.findOneBy(bucketWhere);
      if (!bucket) {
        if (isBucketType(bucketIdOrType)) {
          throw new NotFoundException(`Cannot find a ${bucketIdOrType} bucket.`);
        } else {
          throw new NotFoundException(`Cannot find a bucket with id ${bucketIdOrType}.`);
        }
      }
      where.bucketId = bucket.id;
      if (bucket.type !== 'general') {
        where.userId = user.id;
      }
    }

    if (conversationId) {
      where.conversationId = conversationId;
      where.userId = user.id;
    }

    if (searchQuery && searchQuery != '') {
      where.fileName = Raw((alias) => `LOWER(${alias}) Like '%${searchQuery}%'`);
    }

    if (files && files.length > 0) {
      where.id = In(files);
    }

    const options: FindManyOptions<FileEntity> = { where };
    const total = await this.files.count(options);

    if (pageSize) {
      options.skip = pageSize * page;
      options.take = pageSize;
    }
    options.order = { fileName: 'ASC' };

    if (withContent) {
      options.relations = {
        blobs: true,
      };
    }

    const entities = await this.files.find(options);
    const result = entities?.map(buildFile);

    return new GetFilesResponse(result, total);
  }
}
