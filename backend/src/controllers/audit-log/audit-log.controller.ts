import { Controller, Get, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { LocalAuthGuard, Role, RoleGuard } from 'src/domain/auth';
import { AuditEntityType, BUILTIN_USER_GROUP_ADMIN } from 'src/domain/database';
import { GetAuditLogs, GetAuditLogsResponse } from 'src/domain/audit-log';
import { AuditLogsDto } from './dtos';

@Controller('audit-logs')
@ApiTags('audit-logs')
@UseGuards(LocalAuthGuard)
export class AuditLogController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('')
  @ApiOperation({ operationId: 'getAuditLogs', description: 'Gets the audit log entries.' })
  @ApiQuery({
    name: 'entityType',
    description: 'Filter by entity type.',
    required: false,
    enum: ['extension', 'bucket', 'configuration', 'settings', 'userGroup', 'user'],
  })
  @ApiQuery({
    name: 'entityId',
    description: 'Filter by entity ID.',
    required: false,
    type: String,
  })
  @ApiQuery({
    name: 'page',
    description: 'The page number (0-based).',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'pageSize',
    description: 'The number of items per page.',
    required: false,
    type: Number,
  })
  @ApiOkResponse({ type: AuditLogsDto })
  @Role(BUILTIN_USER_GROUP_ADMIN)
  @UseGuards(RoleGuard)
  async getAuditLogs(
    @Query('entityType') entityType?: AuditEntityType,
    @Query('entityId') entityId?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    const result: GetAuditLogsResponse = await this.queryBus.execute(
      new GetAuditLogs({ entityType, entityId, page, pageSize }),
    );

    return AuditLogsDto.fromDomain(result.auditLogs, result.total);
  }
}
