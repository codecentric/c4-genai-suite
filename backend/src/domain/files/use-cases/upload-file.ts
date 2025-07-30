import { BadRequestException, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import * as uuid from 'uuid';
import {
  BlobCategory,
  BlobEntity,
  BlobRepository,
  BucketEntity,
  BucketRepository,
  FileEntity,
  FileRepository,
  FileSizeLimits,
  FileUploadStatus,
} from 'src/domain/database';
import { User } from 'src/domain/users';
import { assignDefined } from 'src/lib';
import { I18nService } from '../../../localization/i18n.service';
import { UploadedFile } from '../interfaces';
import { FilesApi, ResponseError } from './generated';
import { buildClient, buildFile, getBucketId } from './utils';

export interface UploadFileParams {
  fileIdToUpdate?: number;
  user?: User;
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  fileSize: number;
  bucketId?: number;
  extensionId?: number;
  createEmbeddings: boolean;
  conversationId?: number;
}

export class UploadFile {
  constructor(public readonly params: UploadFileParams) {}
}

export class UploadFileResponse {
  constructor(public readonly file: UploadedFile) {}
}

@CommandHandler(UploadFile)
export class UploadFileHandler implements ICommandHandler<UploadFile, UploadFileResponse> {
  private readonly logger = new Logger(UploadFileHandler.name);

  constructor(
    @InjectRepository(BucketEntity)
    private readonly buckets: BucketRepository,
    @InjectRepository(FileEntity)
    private readonly files: FileRepository,
    @InjectRepository(BlobEntity)
    private readonly blob: BlobRepository,
    private readonly i18n: I18nService,
  ) {}

  private async handleFileWithoutBucket(params: UploadFileParams) {
    const { extensionId, createEmbeddings, buffer, mimeType, fileName, fileSize, user, conversationId } = params;

    if (createEmbeddings) {
      throw new BadRequestException('not allowed to store non embedded files without bucket');
    }

    const entity = this.files.create();
    assignDefined(entity, {
      fileName,
      fileSize,
      mimeType,
      conversationId,
      extensionId,
      uploadStatus: FileUploadStatus.Successful,
      userId: user?.id,
    });
    const created = await this.files.save(entity);

    await this.blob.save({
      id: uuid.v4(),
      fileId: created.id,
      userId: user?.id,
      type: mimeType,
      buffer: buffer.toString('base64'),
      category: BlobCategory.FILE_ORIGINAL,
    });

    return new UploadFileResponse(buildFile(created));
  }

  private async validateBucketAndFile(params: UploadFileParams) {
    const { mimeType, fileName, fileSize, user, conversationId, bucketId } = params;

    const bucket = await this.buckets.findOneBy({ id: bucketId });
    if (!bucket) {
      throw new NotFoundException('No bucket configured.');
    }

    if (bucket.type === 'general' && (user || conversationId)) {
      throw new BadRequestException('not allowed to store in general bucket');
    }

    if (bucket.type === 'conversation' && (!conversationId || !user)) {
      throw new BadRequestException('not allowed to store in conversation bucket');
    }

    if (bucket.type === 'user' && (conversationId || !user)) {
      throw new BadRequestException('not allowed to store in user bucket');
    }

    const api = buildClient(bucket);
    const fileTypes = await api.getFileTypes();

    const imageFileNameExtensions = ['.png', '.jpg', '.jpeg', '.webp'];

    if (imageFileNameExtensions.some((fileNameExtension) => matchExtension(fileName, fileNameExtension))) {
      throw new BadRequestException(`${this.i18n.t('texts.extensions.files.errorNotSupportedFileTypeImage')}`);
    }

    const outdatedFileNameExtensions = ['.doc', '.ppt', '.xls'];
    const outdatedFile = outdatedFileNameExtensions.find((fileNameExtension) => matchExtension(fileName, fileNameExtension));
    if (outdatedFile) {
      throw new BadRequestException(
        `${this.i18n.t('texts.extensions.files.errorOutdatedFileType', { format: `${outdatedFile}x` })}`,
      );
    }

    const supportedFileNameExtensions = fileTypes.items.find((x) => matchExtension(fileName, x.fileNameExtension));
    if (!supportedFileNameExtensions) {
      throw new BadRequestException(this.i18n.t('texts.extensions.files.errorNotSupportedFileType'));
    }

    if (
      bucket.allowedFileNameExtensions?.length &&
      !bucket.allowedFileNameExtensions.includes(supportedFileNameExtensions.fileNameExtension)
    ) {
      throw new BadRequestException(this.i18n.t('texts.extensions.files.errorNotAllowedFileType'));
    }

    if (!isFileSizeWithinLimits(bucket, fileName, mimeType, fileSize)) {
      throw new BadRequestException(this.i18n.t('texts.extensions.files.errorFileTooLarge'));
    }

    // check the user quota
    // Note that this is suceptible for races if multiple files are uploaded at once.
    // We might perform this test for each file, before the first is saved in the database.
    // However, since it should be hard for the user to exploit this, we use this for now.
    if (user && bucket.type === 'user') {
      const quota = bucket.perUserQuota;

      const used = await this.files.countBy({ userId: user.id, bucketId: bucket.id });

      if (used >= quota) {
        throw new BadRequestException(`User quota of ${quota} files exceeded.`);
      }
    }

    return { api, bucket };
  }

  private async initFile(api: FilesApi, params: UploadFileParams) {
    const { fileIdToUpdate, bucketId } = params;

    if (fileIdToUpdate) {
      const existingFile = await this.files.findOneBy({ id: fileIdToUpdate, bucketId });
      if (!existingFile) {
        throw new NotFoundException(`File with id ${fileIdToUpdate} not found in bucket ${bucketId}`);
      }

      await api.deleteFile(existingFile.externalDocumentId.toString());
      return existingFile;
    }

    return this.files.create();
  }

  async execute({ params }: UploadFile): Promise<UploadFileResponse> {
    const { extensionId, buffer, mimeType, fileName, fileSize, user, conversationId, bucketId, createEmbeddings } = params;

    if (!bucketId) {
      return this.handleFileWithoutBucket(params);
    }

    const { api, bucket } = await this.validateBucketAndFile(params);

    const entity = await this.initFile(api, params);

    // Assign the object manually to avoid updating unexpected values.
    assignDefined(entity, {
      fileName,
      fileSize,
      mimeType,
      bucket: createEmbeddings ? bucket : undefined,
      conversationId,
      uploadStatus: FileUploadStatus.InProgress,
      userId: user?.id,
      extensionId,
    });

    const blob = new File([buffer], fileName, { type: mimeType });

    let result: UploadedFile | undefined;

    try {
      // Use the save method otherwise we would not get previous values.
      const created = await this.files.save(entity);
      result = buildFile(created);

      if (createEmbeddings) {
        const bucketPath = getBucketId(bucket, user, conversationId);
        await api.uploadFile(
          encodeURIComponent(fileName),
          mimeType,
          bucketPath,
          (result.externalDocumentId ?? result.id).toString(),
          bucket.indexName,
          {
            body: blob,
          },
        );
        await this.files.update({ id: entity.id }, { uploadStatus: FileUploadStatus.Successful });
      } else {
        const fileContent = await api.processFile(encodeURIComponent(fileName), mimeType, 100000, {
          body: blob,
        });
        await this.blob.save({
          id: uuid.v4(),
          fileId: entity.id,
          userId: user?.id,
          type: 'application/reis+processed',
          buffer: Buffer.from(JSON.stringify(fileContent)).toString('base64'),
          category: BlobCategory.FILE_PROCESSED,
        });
        await this.files.update({ id: entity.id }, { uploadStatus: FileUploadStatus.Successful });
      }

      return new UploadFileResponse(result);
    } catch (err) {
      if (result?.id) {
        await this.files.delete({ id: result.id });
      }

      this.logger.error('Failed to upload file to RAG server.', err);
      if (err instanceof ResponseError && err.response.status === 400) {
        throw new InternalServerErrorException(this.i18n.t('texts.extensions.files.errorUploadingFileDamaged'));
      } else if (err instanceof ResponseError && err.response.status === 413) {
        throw new InternalServerErrorException(this.i18n.t('texts.extensions.files.errorFileTooLarge'));
      } else if (err instanceof ResponseError && err.response.status === 415) {
        throw new InternalServerErrorException(this.i18n.t('texts.extensions.files.errorNotSupportedFileType'));
      } else if (err instanceof ResponseError && err.response.status === 422) {
        throw new InternalServerErrorException(this.i18n.t('texts.extensions.files.errorUploadingREISConfiguration'));
      }
      throw new InternalServerErrorException(this.i18n.t('texts.extensions.files.errorUploadingFile'));
    }
  }
}

export const getRelevantLimit = (fileSizeLimits: FileSizeLimits, fileName: string, mimeType: string) => {
  // get limit by MimeType
  let limit: number = fileSizeLimits[mimeType];

  if (limit === undefined) {
    // otherwise get limit by extension
    const extension = fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase();
    limit = fileSizeLimits[extension];
  }

  if (limit === undefined) {
    // otherwise fallback to default limit
    limit = fileSizeLimits['general'];
  }

  return limit;
};

const isFileSizeWithinLimits = (bucket: BucketEntity, fileName: string, mimeType: string, fileSize: number) => {
  if (!bucket.fileSizeLimits) {
    // if no limits are defined, they are never violated
    return true;
  }

  // filesize limit in MB
  const limit = getRelevantLimit(bucket.fileSizeLimits, fileName, mimeType);

  if (limit !== undefined && fileSize > limit * 1e6) {
    return false;
  }
  return true;
};

export function matchExtension(fileName: string, extension: string): boolean {
  return fileName.toLowerCase().endsWith(extension.toLowerCase());
}
