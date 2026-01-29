import { HttpException, HttpStatus } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { AuditLogService, PerformedBy } from 'src/domain/audit-log';
import { BucketEntity, BucketRepository } from 'src/domain/database';
import { assignDefined } from 'src/lib';
import { Bucket } from '../interfaces';
import { buildBucket } from './utils';

type Values = Pick<
  Bucket,
  | 'allowedFileNameExtensions'
  | 'endpoint'
  | 'headers'
  | 'isDefault'
  | 'perUserQuota'
  | 'name'
  | 'indexName'
  | 'type'
  | 'fileSizeLimits'
>;

export class CreateBucket {
  constructor(
    public readonly values: Values,
    public readonly performedBy: PerformedBy,
  ) {}
}

export class CreateBucketResponse {
  constructor(public readonly bucket: Bucket) {}
}

@CommandHandler(CreateBucket)
export class CreateBucketHandler implements ICommandHandler<CreateBucket, CreateBucketResponse> {
  constructor(
    @InjectRepository(BucketEntity)
    private readonly buckets: BucketRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async execute(command: CreateBucket): Promise<CreateBucketResponse> {
    const { values, performedBy } = command;
    const { endpoint, indexName, headers, isDefault, perUserQuota, allowedFileNameExtensions, name, type, fileSizeLimits } =
      values;

    // there may only be one user/default bucket
    if (type === 'user' || type === 'conversation') {
      const existingBucket = await this.buckets.findOneBy({ type });

      if (existingBucket) {
        throw new HttpException(`${type} bucket already exists. There may only be one`, HttpStatus.BAD_REQUEST);
      }
    }

    const entity = this.buckets.create();

    // Assign the object manually to avoid updating unexpected values.
    assignDefined(entity, {
      endpoint,
      indexName,
      headers,
      isDefault,
      perUserQuota,
      allowedFileNameExtensions,
      name,
      type,
      fileSizeLimits,
    });

    // Use the save method otherwise we would not get previous values.
    const created = await this.buckets.save(entity);
    const result = buildBucket(created);

    await this.auditLogService.createAuditLog({
      entityType: 'bucket',
      entityId: String(created.id),
      action: 'create',
      userId: performedBy.id,
      userName: performedBy.name,
      snapshot: result,
    });

    return new CreateBucketResponse(result);
  }
}
