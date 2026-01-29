import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogEntity } from 'src/domain/database';
import { AuditLogService, GetAuditLogsHandler } from './use-cases';

@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature([AuditLogEntity])],
  providers: [AuditLogService, GetAuditLogsHandler],
  exports: [AuditLogService],
})
export class AuditLogModule {}
