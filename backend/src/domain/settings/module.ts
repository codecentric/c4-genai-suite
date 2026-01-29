import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogModule } from 'src/domain/audit-log';
import { BlobEntity, SettingEntity } from 'src/domain/database';
import { DeleteBlobHandler, GetBlobHandler, GetSettingsHandler, UpdateSettingsHandler, UploadBlobHandler } from './use-cases';

@Module({
  imports: [AuditLogModule, TypeOrmModule.forFeature([BlobEntity, SettingEntity])],
  providers: [
    DeleteBlobHandler, //
    GetBlobHandler,
    GetSettingsHandler,
    UpdateSettingsHandler,
    UploadBlobHandler,
  ],
})
export class SettingsModule {}
