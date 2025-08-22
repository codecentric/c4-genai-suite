import { ForbiddenException, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { FileEntity, FileRepository } from 'src/domain/database';
import { User } from 'src/domain/users';
import { isNumber } from 'src/lib';
import { ConversationFileEntity, ConversationFileRepository } from '../../database/entities/conversation-file';
import { buildClient } from './utils';

export class DeleteFile {
  constructor(
    public readonly source: number | User,
    public readonly id: number,
    public readonly conversationId?: number,
  ) {}
}

export class DeleteFileResponse {}

@CommandHandler(DeleteFile)
export class DeleteFileHandler implements ICommandHandler<DeleteFile, DeleteFileResponse> {
  private readonly logger = new Logger(DeleteFileHandler.name);

  constructor(
    @InjectRepository(FileEntity)
    private readonly files: FileRepository,
    @InjectRepository(ConversationFileEntity)
    private readonly conversationFiles: ConversationFileRepository,
  ) {}

  async execute(command: DeleteFile): Promise<DeleteFileResponse> {
    const { id, source, conversationId } = command;

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
      if (conversationId) {
        await this.conversationFiles.delete({ fileId: entity.id, conversationId });
        if (entity.bucket?.type !== 'conversation') {
          return new DeleteFileResponse();
        }

        const count = await this.conversationFiles.count({ where: { fileId: entity.id } });
        if (count > 0) {
          return new DeleteFileResponse();
        }
      }

      await api?.deleteFile(entity.id.toString(), entity.bucket?.indexName);
      await this.files.remove(entity);
    } catch (err) {
      this.logger.error('Failed to delete file from RAG server.', err);
      throw new InternalServerErrorException('Deleting from RAG server failed.');
    }

    return new DeleteFileResponse();
  }
}
