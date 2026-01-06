import { BadRequestException, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { BucketEntity, BucketRepository } from '../../database';
import { buildClient } from './utils';

export class GetDocumentContent {
  constructor(
    public readonly bucketId: number,
    public readonly chunkIds: string[],
  ) {}
}

export class GetDocumentContentResponse {
  constructor(public readonly documentContent: Array<string | null>) {}
}

@QueryHandler(GetDocumentContent)
export class GetDocumentContentHandler implements IQueryHandler<GetDocumentContent, GetDocumentContentResponse> {
  constructor(
    @InjectRepository(BucketEntity)
    private readonly bucketRepository: BucketRepository,
  ) {}

  async execute(query: GetDocumentContent): Promise<GetDocumentContentResponse> {
    const { bucketId, chunkIds } = query;

    if (!chunkIds || chunkIds.length === 0) {
      throw new BadRequestException('Chunk IDs are required');
    }

    const bucket = await this.bucketRepository.findOneBy({
      id: bucketId,
    });
    if (!bucket) {
      throw new NotFoundException(`Cannot find a bucket with id ${bucketId}`);
    }

    const api = buildClient(bucket);
    const result = await api?.getDocumentsContent(chunkIds, bucket?.indexName);
    return new GetDocumentContentResponse(result ?? []);
  }
}
