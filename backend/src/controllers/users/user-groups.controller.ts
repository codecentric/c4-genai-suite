import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { LocalAuthGuard, Role, RoleGuard } from 'src/domain/auth';
import { BUILTIN_USER_GROUP_ADMIN } from 'src/domain/database';
import {
  CreateUserGroup,
  CreateUserGroupResponse,
  DeleteUserGroup,
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
    const command = new CreateUserGroup(body, req.user);

    const result: CreateUserGroupResponse = await this.commandBus.execute(command);

    return UserGroupDto.fromDomain(result.userGroup);
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
    const command = new UpdateUserGroup(id, body, req.user);

    const result: UpdateUserGroupResponse = await this.commandBus.execute(command);

    return UserGroupDto.fromDomain(result.userGroup);
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
    const command = new DeleteUserGroup(id, req.user);
    await this.commandBus.execute(command);
  }
}
