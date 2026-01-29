import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuditLogService } from 'src/domain/audit-log';
import { LocalAuthGuard, Role, RoleGuard } from 'src/domain/auth';
import { BUILTIN_USER_GROUP_ADMIN } from 'src/domain/database';
import {
  CreateUserGroup,
  CreateUserGroupResponse,
  DeleteUserGroup,
  GetUserGroup,
  GetUserGroupResponse,
  GetUserGroups,
  GetUserGroupsResponse,
  UpdateUserGroup,
  UpdateUserGroupResponse,
} from 'src/domain/users';
import { UpsertUserGroupDto, UserGroupDto, UserGroupsDto } from './dtos';

@Controller('user-groups')
@ApiTags('users')
@UseGuards(LocalAuthGuard)
export class UserGroupsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get('')
  @ApiOperation({ operationId: 'getUserGroups', description: 'Gets the user groups.' })
  @ApiOkResponse({ type: UserGroupsDto })
  @Role(BUILTIN_USER_GROUP_ADMIN)
  @UseGuards(RoleGuard)
  async getUserGroups() {
    const result: GetUserGroupsResponse = await this.queryBus.execute(new GetUserGroups());

    return UserGroupsDto.fromDomain(result.userGroups);
  }

  @Post('')
  @ApiOperation({ operationId: 'postUserGroup', description: 'Creates a user group.' })
  @ApiOkResponse({ type: UserGroupDto })
  @Role(BUILTIN_USER_GROUP_ADMIN)
  @UseGuards(RoleGuard)
  async postUserGroup(@Body() body: UpsertUserGroupDto, @Req() req: Request) {
    const command = new CreateUserGroup(body);

    const result: CreateUserGroupResponse = await this.commandBus.execute(command);

    const userGroupDto = UserGroupDto.fromDomain(result.userGroup);

    await this.auditLogService.createAuditLog({
      entityType: 'userGroup',
      entityId: result.userGroup.id,
      action: 'create',
      userId: req.user.id,
      userName: req.user.name,
      snapshot: JSON.parse(JSON.stringify(userGroupDto)),
    });

    return userGroupDto;
  }

  @Put(':id')
  @ApiOperation({ operationId: 'putUserGroup', description: 'Updates the user group.' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the user group.',
    required: true,
  })
  @ApiOkResponse({ type: UserGroupDto })
  @Role(BUILTIN_USER_GROUP_ADMIN)
  @UseGuards(RoleGuard)
  async putUserGroup(@Param('id') id: string, @Body() body: UpsertUserGroupDto, @Req() req: Request) {
    const command = new UpdateUserGroup(id, body);

    const result: UpdateUserGroupResponse = await this.commandBus.execute(command);

    const userGroupDto = UserGroupDto.fromDomain(result.userGroup);

    await this.auditLogService.createAuditLog({
      entityType: 'userGroup',
      entityId: result.userGroup.id,
      action: 'update',
      userId: req.user.id,
      userName: req.user.name,
      snapshot: JSON.parse(JSON.stringify(userGroupDto)),
    });

    return userGroupDto;
  }

  @Delete(':id')
  @ApiOperation({ operationId: 'deleteUserGroup', description: 'Deletes an user group.' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the user.',
    required: true,
  })
  @ApiNoContentResponse()
  @Role(BUILTIN_USER_GROUP_ADMIN)
  @UseGuards(RoleGuard)
  async deleteUserGroup(@Param('id') id: string, @Req() req: Request) {
    // Get user group before deletion for audit log
    const userGroupResult: GetUserGroupResponse = await this.queryBus.execute(new GetUserGroup(id));
    const userGroupDto = userGroupResult.userGroup ? UserGroupDto.fromDomain(userGroupResult.userGroup) : null;

    const command = new DeleteUserGroup(id);
    await this.commandBus.execute(command);

    if (userGroupDto) {
      await this.auditLogService.createAuditLog({
        entityType: 'userGroup',
        entityId: id,
        action: 'delete',
        userId: req.user.id,
        userName: req.user.name,
        snapshot: JSON.parse(JSON.stringify(userGroupDto)),
      });
    }
  }
}
