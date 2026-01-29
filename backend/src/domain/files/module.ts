import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogModule } from 'src/domain/audit-log';
import { BlobEntity, BucketEntity, ExtensionEntity, FileEntity } from 'src/domain/database';
import { ConversationFileEntity } from '../database/entities/conversation-file';
import {
  CreateBucketHandler,
  DeleteBucketHandler,
  DeleteFileHandler,
  GetBucketHandler,
  GetBucketsHandler,
  GetDocumentContentHandler,
  GetDocumentPdfHandler,
  GetFilesHandler,
  GetFileTypesHandler,
  SearchFilesHandler,
  TestBucketHandler,
  UpdateBucketHandler,
  UploadFileHandler,
} from './use-cases';

@Module({
  imports: [
    AuditLogModule,
    CqrsModule,
    TypeOrmModule.forFeature([BucketEntity, FileEntity, ExtensionEntity, BlobEntity, ConversationFileEntity]),
  ],
  providers: [
    CreateBucketHandler,
    DeleteBucketHandler,
    DeleteFileHandler,
    GetBucketHandler,
    GetBucketsHandler,
    GetDocumentContentHandler,
    GetDocumentPdfHandler,
    GetFilesHandler,
    GetFileTypesHandler,
    SearchFilesHandler,
    TestBucketHandler,
    UpdateBucketHandler,
    UploadFileHandler,
  ],
})
export class FilesModule {}
