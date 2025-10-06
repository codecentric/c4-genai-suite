import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/domain/users';
import { BucketEntity, BucketRepository, FileEntity, FileRepository } from '../../database';
import { buildClient } from './utils';

export class GetDocumentPdf {
  constructor(
    public readonly user: User,
    public readonly bucketId: number,
    public readonly docId: string,
  ) {}
}

export class GetDocumentPdfResponse {
  constructor(public readonly documentPdf: Blob | null) {}
}

@QueryHandler(GetDocumentPdf)
export class GetDocumentPdfHandler implements IQueryHandler<GetDocumentPdf, GetDocumentPdfResponse> {
  constructor(
    @InjectRepository(BucketEntity)
    private readonly bucketRepository: BucketRepository,
    @InjectRepository(FileEntity)
    private readonly fileRepository: FileRepository,
  ) {}

  async execute(query: GetDocumentPdf): Promise<GetDocumentPdfResponse> {
    const { bucketId, docId, user } = query;

    const bucket = await this.bucketRepository.findOneBy({
      id: bucketId,
    });
    if (!bucket) {
      throw new NotFoundException(`Cannot find a bucket with id ${bucketId}`);
    }

    // assure that the user may access the file (this is necessary since the doc_ids are predictable)
    if (bucket.type === 'user' || bucket.type === 'conversation') {
      const file = await this.fileRepository.findOneBy({ id: parseInt(docId, 10) });
      if (file?.userId !== user.id) {
        // either file does not exist or the user may not see it. So 404 is the correct response
        throw new NotFoundException(`Cannot find a document with id ${docId}`);
      }
    }

    const api = buildClient(bucket);
    const result = await api?.getDocumentPdf(docId);
    return new GetDocumentPdfResponse(result ?? null);
  }
}
