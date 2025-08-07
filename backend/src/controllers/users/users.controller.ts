import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { LocalAuthGuard, Role, RoleGuard } from 'src/domain/auth';
import { BUILTIN_USER_GROUP_ADMIN } from 'src/domain/database';
import {
  CreateUser,
  CreateUserResponse,
  DeleteUser,
  GetUser,
  GetUserResponse,
  GetUsers,
  GetUsersResponse,
  UpdateUser,
  UpdateUserResponse,
} from 'src/domain/users';
import { ChangePasswordDto, UpsertUserDto, UserDto, UsersDto } from './dtos';

@Controller('users')
@ApiTags('users')
@UseGuards(LocalAuthGuard)
export class UsersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get('')
  @ApiOperation({ operationId: 'getUsers', description: 'Gets the users.' })
  @ApiOkResponse({ type: UsersDto })
  @ApiQuery({
    name: 'query',
    description: 'The query to search by email address.',
    required: false,
  })
  @ApiQuery({
    name: 'page',
    description: 'The page count.',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'pageSize',
    description: 'The page size.',
    required: false,
    type: Number,
  })
  @Role(BUILTIN_USER_GROUP_ADMIN)
  @UseGuards(RoleGuard)
  async getUsers(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
    @Query('query') query?: string,
  ) {
    const result: GetUsersResponse = await this.queryBus.execute(new GetUsers(page || 0, pageSize || 20, query));

    return UsersDto.fromDomain(result.users, result.total);
  }

  @Get(':id')
  @ApiOperation({ operationId: 'getUser', description: 'Get the user.' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the user.',
    required: true,
  })
  @ApiOkResponse({ type: UserDto })
  @Role(BUILTIN_USER_GROUP_ADMIN)
  @UseGuards(RoleGuard)
  async getUser(@Param('id') id: string) {
    const result: GetUserResponse = await this.queryBus.execute(new GetUser(id));

    if (!result.user) {
      throw new NotFoundException();
    }

    return UserDto.fromDomain(result.user);
  }

  @Post('')
  @ApiOperation({ operationId: 'postUser', description: 'Creates a user.' })
  @ApiOkResponse({ type: UserDto })
  @Role(BUILTIN_USER_GROUP_ADMIN)
  @UseGuards(RoleGuard)
  async postUser(@Body() body: UpsertUserDto) {
    const command = new CreateUser(body);

    const result: CreateUserResponse = await this.commandBus.execute(command);

    return UserDto.fromDomain(result.user);
  }

  @Put(':id')
  @ApiOperation({ operationId: 'putUser', description: 'Updates the user.' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the user.',
    required: true,
  })
  @ApiOkResponse({ type: UserDto })
  @Role(BUILTIN_USER_GROUP_ADMIN)
  @UseGuards(RoleGuard)
  async putUser(@Param('id') id: string, @Body() body: UpsertUserDto) {
    const command = new UpdateUser(id, body);

    const result: UpdateUserResponse = await this.commandBus.execute(command);

    return UserDto.fromDomain(result.user);
  }

  @Put('me/password')
  @ApiOperation({ operationId: 'putMyPassword', description: 'Updates the user password.' })
  @ApiNoContentResponse()
  async putMyPassword(@Req() req: Request, @Body() body: ChangePasswordDto) {
    await this.commandBus.execute(
      new UpdateUser(req.user.id, { password: body.password, currentPassword: body.currentPassword }),
    );
  }

  @Delete(':id')
  @ApiOperation({ operationId: 'deleteUser', description: 'Deletes an user.' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the user.',
    required: true,
  })
  @ApiNoContentResponse()
  @Role(BUILTIN_USER_GROUP_ADMIN)
  @UseGuards(RoleGuard)
  async deleteUser(@Param('id') id: string) {
    const command = new DeleteUser(id);

    await this.commandBus.execute(command);
  }
}
