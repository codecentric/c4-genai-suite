import { ForbiddenException, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { FileEntity, FileRepository } from 'src/domain/database';
import { User } from 'src/domain/users';
import { isNumber } from 'src/lib';
import { buildClient } from './utils';

export class DeleteFile {
  constructor(
    public readonly source: number | User,
    public readonly id: number,
  ) {}
}

export class DeleteFileResponse {}

@CommandHandler(DeleteFile)
export class DeleteFileHandler implements ICommandHandler<DeleteFile, DeleteFileResponse> {
  private readonly logger = new Logger(DeleteFileHandler.name);

  constructor(
    @InjectRepository(FileEntity)
    private readonly files: FileRepository,
  ) {}

  async execute(command: DeleteFile): Promise<DeleteFileResponse> {
    const { id, source } = command;

    const entity = await this.files.findOne({
      where: { id },
      relations: {
        bucket: true,
      },
    });

    if (!entity) {
      throw new NotFoundException(`File with id '${id}' was not found`);
    }

    if (isNumber(source)) {
      if (entity.bucketId !== source) {
        throw new ForbiddenException();
      }
    } else {
      if (entity.userId !== source.id) {
        throw new ForbiddenException();
      }
    }

    const api = entity.bucket ? buildClient(entity.bucket) : undefined;
    try {
      const count = await this.files.count({ where: { externalDocumentId: entity.externalDocumentId } });

      if (count === 1) {
        await api?.deleteFile(entity.externalDocumentId.toString(), entity.bucket?.indexName);
      }

      await this.files.remove(entity);
    } catch (err) {
      this.logger.error('Failed to delete file from RAG server.', err);
      throw new InternalServerErrorException('Deleting from RAG server failed.');
    }

    return new DeleteFileResponse();
  }
}
