import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogModule } from 'src/domain/audit-log';
import { BucketEntity, ConfigurationEntity, ConversationEntity, ExtensionEntity, UserGroupEntity } from 'src/domain/database';
import { ConfigurationUserEntity } from '../database/entities/configuration-user';
import { ExplorerService } from './services';
import {
  CreateConfigurationHandler,
  CreateExtensionHandler,
  DeleteConfigurationHandler,
  DeleteExtensionHandler,
  DuplicateConfigurationHandler,
  GetBucketAvailabilityHandler,
  GetConfigurationHandler,
  GetConfigurationsHandler,
  GetExtensionHandler,
  GetExtensionsHandler,
  RebuildExtensionHandler,
  TestExtensionHandler,
  UpdateConfigurationHandler,
  UpdateExtensionHandler,
} from './use-cases';
import { GetConfigurationUserValuesHandler } from './use-cases/get-configuration-user-values';
import { UpdateConfigurationUserValuesHandler } from './use-cases/update-configuration-user-values';

@Module({
  imports: [
    AuditLogModule,
    ConfigModule,
    CqrsModule,
    TypeOrmModule.forFeature([
      BucketEntity,
      ConfigurationEntity,
      ConfigurationUserEntity,
      ConversationEntity,
      ExtensionEntity,
      UserGroupEntity,
    ]),
  ],
  providers: [
    CreateConfigurationHandler,
    CreateExtensionHandler,
    GetConfigurationHandler,
    DeleteConfigurationHandler,
    DeleteExtensionHandler,
    ExplorerService,
    GetBucketAvailabilityHandler,
    GetConfigurationsHandler,
    GetExtensionHandler,
    GetExtensionsHandler,
    TestExtensionHandler,
    RebuildExtensionHandler,
    UpdateConfigurationHandler,
    UpdateExtensionHandler,
    DuplicateConfigurationHandler,
    GetConfigurationUserValuesHandler,
    UpdateConfigurationUserValuesHandler,
  ],
  exports: [ExplorerService],
})
export class ExtensionModule {}
