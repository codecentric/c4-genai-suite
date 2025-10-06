import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { BucketEntity, BucketRepository } from 'src/domain/database';
import { ResponseError } from './generated';
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
      try {
        await api.deleteFile(file.id.toString());
      } catch (error) {
        if ((error as ResponseError)?.response.status === 404) {
          // if the file is not found, we can ignore the error trying to delete it
        }
        throw error;
      }
    }

    await this.buckets.delete({ id });

    return new DeleteBucketResponse();
  }
}
