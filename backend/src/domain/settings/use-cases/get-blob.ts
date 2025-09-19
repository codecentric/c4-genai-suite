import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { BlobEntity, BlobRepository } from 'src/domain/database';

export class GetBlob {
  constructor(public readonly id: string) {}
}

export class GetBlobResponse {
  constructor(public readonly blob?: { buffer: Buffer; type: string }) {}
}

@QueryHandler(GetBlob)
export class GetBlobHandler implements IQueryHandler<GetBlob, GetBlobResponse> {
  constructor(
    @InjectRepository(BlobEntity)
    private readonly blobs: BlobRepository,
  ) {}

  async execute(request: GetBlob): Promise<GetBlobResponse> {
    const { id } = request;

    const entity = await this.blobs.findOneBy({ id });

    if (!entity) {
      return new GetBlobResponse();
    }

    const buffer = Buffer.from(entity.buffer, 'base64');

    return new GetBlobResponse({ type: entity.type, buffer });
  }
}
