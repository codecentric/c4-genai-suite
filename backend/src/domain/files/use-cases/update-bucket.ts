import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { AuditLogService, PerformedBy } from 'src/domain/audit-log';
import { BucketEntity, BucketRepository } from 'src/domain/database';
import { assignDefined } from 'src/lib';
import { Bucket } from '../interfaces';
import { buildBucket } from './utils';

type Values = Partial<
  Pick<Bucket, 'allowedFileNameExtensions' | 'endpoint' | 'headers' | 'perUserQuota' | 'name' | 'indexName' | 'fileSizeLimits'>
>;

export class UpdateBucket {
  constructor(
    public readonly id: number,
    public readonly values: Values,
    public readonly performedBy: PerformedBy,
  ) {}
}

export class UpdateBucketResponse {
  constructor(public readonly bucket: Bucket) {}
}

@CommandHandler(UpdateBucket)
export class UpdateBucketHandler implements ICommandHandler<UpdateBucket, UpdateBucketResponse> {
  constructor(
    @InjectRepository(BucketEntity)
    private readonly buckets: BucketRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async execute(command: UpdateBucket): Promise<UpdateBucketResponse> {
    const { id, values, performedBy } = command;
    const { endpoint, indexName, headers, perUserQuota, allowedFileNameExtensions, name, fileSizeLimits } = values;

    const entity = await this.buckets.findOneBy({ id });

    if (!entity) {
      throw new NotFoundException();
    }

    // Assign the object manually to avoid updating unexpected values.
    assignDefined(entity, { endpoint, indexName, headers, perUserQuota, allowedFileNameExtensions, name, fileSizeLimits });

    // Use the save method otherwise we would not get previous values.
    const updated = await this.buckets.save(entity);
    const result = buildBucket(updated);

    await this.auditLogService.createAuditLog({
      entityType: 'bucket',
      entityId: String(updated.id),
      action: 'update',
      userId: performedBy.id,
      userName: performedBy.name,
      snapshot: result,
    });

    return new UpdateBucketResponse(result);
  }
}
