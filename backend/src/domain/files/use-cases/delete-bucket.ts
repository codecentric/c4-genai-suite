import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { BucketEntity, BucketRepository } from 'src/domain/database';
import { buildClient } from './utils';

export class DeleteBucket {
  constructor(public readonly id: number) {}
}

export class DeleteBucketResponse {}

@CommandHandler(DeleteBucket)
export class DeleteBucketHandler implements ICommandHandler<DeleteBucket, DeleteBucketResponse> {
  constructor(
    @InjectRepository(BucketEntity)
    private readonly buckets: BucketRepository,
  ) {}

  async execute(command: DeleteBucket): Promise<DeleteBucketResponse> {
    const { id } = command;

    const bucket = await this.buckets.findOneBy({ id });

    if (!bucket) {
      throw new NotFoundException();
    }

    const api = buildClient(bucket);

    const files = await bucket.files;
    for (const file of files) {
      await api.deleteFile(file.id.toString());
    }

    await this.buckets.delete({ id });

    return new DeleteBucketResponse();
  }
}
