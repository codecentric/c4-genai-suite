import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { BucketEntity, BucketRepository } from '../../database';
import { buildClient } from './utils';

export class GetDocumentPdf {
  constructor(
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
  ) {}

  async execute(query: GetDocumentPdf): Promise<GetDocumentPdfResponse> {
    const { bucketId, docId } = query;

    const bucket = await this.bucketRepository.findOneBy({
      id: bucketId,
    });
    if (!bucket) {
      throw new NotFoundException(`Cannot find a bucket with id ${bucketId}`);
    }

    // TODO: assure that the user may access the file

    const api = buildClient(bucket);
    const result = await api?.getDocumentPdf(docId);
    return new GetDocumentPdfResponse(result ?? null);
  }
}
