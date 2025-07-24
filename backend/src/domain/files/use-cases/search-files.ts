import { NotFoundException } from '@nestjs/common';
import { InternalServerErrorException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { I18nService } from 'nestjs-i18n';
import { Source } from 'src/domain/chat';
import { BucketEntity, BucketRepository } from 'src/domain/database';
import { User } from 'src/domain/users';
import { SearchResult } from '../interfaces';
import { ResponseError } from './generated';
import { buildClient } from './utils';

export class SearchFiles {
  constructor(
    public readonly bucketId: number,
    public readonly query: string,
    public readonly user: User,
    public readonly take = 10,
    public readonly externalDocumentIds: number[] | null = null,
    public readonly conversationId: number | null = null,
  ) {}
}

export class SearchFilesResponse {
  constructor(
    public readonly files: SearchResult[],
    public readonly debug?: string,
    public readonly sources?: Source[],
  ) {}
}

@QueryHandler(SearchFiles)
export class SearchFilesHandler implements IQueryHandler<SearchFiles, SearchFilesResponse> {
  constructor(
    @InjectRepository(BucketEntity)
    private readonly buckets: BucketRepository,
    private readonly i18n: I18nService,
  ) {}

  async execute(query: SearchFiles): Promise<SearchFilesResponse> {
    const { bucketId, query: search, user, take, externalDocumentIds } = query;

    const bucket = await this.buckets.findOneBy({ id: bucketId });
    if (!bucket) {
      throw new NotFoundException('No file server configured for users.');
    }

    const userSpecific = bucket.type === 'user';
    const chatSpecific = bucket.type === 'conversation';

    let ragBucket: string | null = bucketId.toString();

    if (userSpecific) {
      ragBucket = `${bucket.id}/${user.id}`;
    } else if (chatSpecific) {
      ragBucket = null;
    }

    const api = buildClient(bucket);
    try {
      const result = await api.getFiles(search, take, ragBucket, bucket.indexName, externalDocumentIds?.join(','));
      return new SearchFilesResponse(result.files, result.debug, result.sources);
    } catch (err) {
      if (err instanceof ResponseError && err.response.status === 422) {
        throw new InternalServerErrorException(this.i18n.t('texts.extensions.files.errorREISConfiguration'));
      }
      throw new InternalServerErrorException(this.i18n.t('texts.extensions.files.errorSearchingFile'));
    }
  }
}
