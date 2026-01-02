import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { JsonContains } from 'typeorm';
import { BucketEntity, BucketRepository, ExtensionEntity, ExtensionRepository } from 'src/domain/database';
import { ResponseError } from './generated';
import { buildClient } from './utils';

export class DeleteBucket {
  constructor(public readonly id: number) {}
}

export class DeleteBucketResponse {}

@CommandHandler(DeleteBucket)
export class DeleteBucketHandler implements ICommandHandler<DeleteBucket, DeleteBucketResponse> {
  private readonly logger = new Logger(DeleteBucketHandler.name);

  constructor(
    @InjectRepository(BucketEntity)
    private readonly buckets: BucketRepository,
    @InjectRepository(ExtensionEntity)
    private readonly extensions: ExtensionRepository,
  ) {}

  async execute(command: DeleteBucket): Promise<DeleteBucketResponse> {
    const { id } = command;

    const bucket = await this.buckets.findOneBy({ id });

    if (!bucket) {
      throw new NotFoundException();
    }

    const extensionUsingBucket = await this.extensions.findOne({
      where: { values: JsonContains({ bucket: Number(id) }) },
    });
    if (extensionUsingBucket !== null) {
      throw new BadRequestException(
        `Bucket ${bucket.name ?? ''} cannot be deleted because it is used by one or more extensions.`,
      );
    }

    const api = buildClient(bucket);

    const files = await bucket.files;
    for (const file of files) {
      try {
        await api.deleteFile(file.id.toString());
      } catch (error) {
        if ((error as ResponseError)?.response.status === 404) {
          // if the file is not found, we can ignore the error trying to delete it
          this.logger.warn(`File ${file.id} not found in remote storage, assuming it was already deleted.`);
          continue;
        }
        throw error;
      }
    }

    await this.buckets.delete({ id });

    return new DeleteBucketResponse();
  }
}
