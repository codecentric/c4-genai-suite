import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlobEntity, BucketEntity, ExtensionEntity, FileEntity } from 'src/domain/database';
import {
  CreateBucketHandler,
  DeleteBucketHandler,
  DeleteFileHandler,
  GetBucketHandler,
  GetBucketsHandler,
  GetDocumentContentHandler,
  GetFilesHandler,
  GetFileTypesHandler,
  SearchFilesHandler,
  TestBucketHandler,
  UpdateBucketHandler,
  UploadFileHandler,
} from './use-cases';

@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature([BucketEntity, FileEntity, ExtensionEntity, BlobEntity])],
  providers: [
    CreateBucketHandler,
    DeleteBucketHandler,
    DeleteFileHandler,
    GetBucketHandler,
    GetBucketsHandler,
    GetDocumentContentHandler,
    GetFilesHandler,
    GetFileTypesHandler,
    SearchFilesHandler,
    TestBucketHandler,
    UpdateBucketHandler,
    UploadFileHandler,
  ],
})
export class FilesModule {}
