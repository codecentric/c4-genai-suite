import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { LocalAuthGuard, Role, RoleGuard } from 'src/domain/auth';
import { BUILTIN_USER_GROUP_ADMIN } from 'src/domain/database';
import {
  ConfiguredExtension,
  CreateConfiguration,
  CreateConfigurationResponse,
  CreateExtension,
  CreateExtensionResponse,
  DeleteConfiguration,
  DeleteExtension,
  DuplicateConfiguration,
  GetBucketAvailability,
  GetBucketAvailabilityResponse,
  GetConfiguration,
  GetConfigurationResponse,
  GetConfigurations,
  GetConfigurationsResponse,
  GetExtensions,
  GetExtensionsResponse,
  UpdateConfiguration,
  UpdateConfigurationResponse,
  UpdateExtension,
  UpdateExtensionResponse,
} from 'src/domain/extensions';
import { ExplorerService } from 'src/domain/extensions/services';
import {
  GetConfigurationUserValues,
  GetConfigurationUserValuesResponse,
} from 'src/domain/extensions/use-cases/get-configuration-user-values';
import { DuplicateConfigurationResponse } from '../../domain/extensions/use-cases';
import { UpdateConfigurationUserValues } from '../../domain/extensions/use-cases/update-configuration-user-values';
import {
  BucketAvailabilityDto,
  ConfigurationDto,
  ConfigurationsDto,
  ConfigurationUserValuesDto,
  CreateExtensionDto,
  ExtensionDto,
  ExtensionsDto,
  UpdateExtensionDto,
  UpsertConfigurationDto,
} from './dtos';

@Controller('configurations')
@ApiTags('extensions')
@UseGuards(LocalAuthGuard)
export class ConfigurationsController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
    private readonly explorer: ExplorerService,
  ) {}

  @Get('')
  @ApiOperation({ operationId: 'getConfigurations', description: 'Gets the configured and available extensions.' })
  @ApiQuery({
    name: 'enabled',
    description: 'Indicates if only enabled configurations should be returned.',
    required: false,
    type: Boolean,
  })
  @ApiOkResponse({ type: ConfigurationsDto })
  async getConfigurations(@Req() req: Request, @Query('enabled') enabled?: boolean) {
    const fetchEnabledWithExtensions = enabled ?? false;

    const result: GetConfigurationsResponse = await this.queryBus.execute(
      new GetConfigurations(req.user, fetchEnabledWithExtensions, fetchEnabledWithExtensions),
    );
    return ConfigurationsDto.fromDomain(result.configurations);
  }

  @Get(':id')
  @ApiOperation({ operationId: 'getConfiguration', description: 'Gets a configuration with the given id.' })
  @ApiOkResponse({ type: ConfigurationDto })
  @ApiParam({
    name: 'id',
    description: 'The ID of the configuration',
    required: true,
    type: Number,
  })
  async getConfiguration(@Param('id') id: number) {
    const result: GetConfigurationResponse = await this.queryBus.execute(new GetConfiguration(id));

    return ConfigurationDto.fromDomain(result.configuration);
  }

  @Post('')
  @ApiOperation({ operationId: 'postConfiguration', description: 'Creates a configuration.' })
  @ApiOkResponse({ type: ConfigurationDto })
  @Role(BUILTIN_USER_GROUP_ADMIN)
  @UseGuards(RoleGuard)
  async postConfiguration(@Body() body: UpsertConfigurationDto) {
    const command = new CreateConfiguration(body);

    const result: CreateConfigurationResponse = await this.commandBus.execute(command);

    return ConfigurationDto.fromDomain(result.configuration);
  }

  @Put(':id')
  @ApiOperation({ operationId: 'putConfiguration', description: 'Updates an extension.' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the configuration.',
    required: true,
    type: Number,
  })
  @ApiOkResponse({ type: ConfigurationDto })
  @Role(BUILTIN_USER_GROUP_ADMIN)
  @UseGuards(RoleGuard)
  async putConfiguration(@Param('id') id: number, @Body() body: UpsertConfigurationDto) {
    const command = new UpdateConfiguration(id, body);

    const result: UpdateConfigurationResponse = await this.commandBus.execute(command);

    return ConfigurationDto.fromDomain(result.configuration);
  }

  @Delete(':id')
  @ApiOperation({ operationId: 'deleteConfiguration', description: 'Deletes a configuration.' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the configuration.',
    required: true,
    type: Number,
  })
  @ApiNoContentResponse()
  @Role(BUILTIN_USER_GROUP_ADMIN)
  @UseGuards(RoleGuard)
  async deleteConfiguration(@Param('id') id: number) {
    const command = new DeleteConfiguration(id);

    await this.commandBus.execute(command);
  }

  @Get(':id/user-values')
  @ApiOperation({ operationId: 'getConfigurationUserValues', description: 'Gets the user configured values.' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the configuration.',
    required: true,
    type: Number,
  })
  @ApiOkResponse({ type: ConfigurationUserValuesDto })
  async getConfigurationUserValues(@Param('id') id: number, @Req() req: Request) {
    const result: GetConfigurationUserValuesResponse = await this.queryBus.execute(
      new GetConfigurationUserValues(id, req.user.id),
    );
    return ConfigurationUserValuesDto.fromDomain(result.configuration);
  }

  @Put(':id/user-values')
  @ApiOperation({ operationId: 'updateConfigurationUserValues', description: 'Updates the user configured values.' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the configuration.',
    required: true,
    type: Number,
  })
  @ApiOkResponse({ type: ConfigurationUserValuesDto })
  async updateConfigurationUserValues(@Param('id') id: number, @Body() body: ConfigurationUserValuesDto, @Req() req: Request) {
    await this.queryBus.execute(new UpdateConfigurationUserValues(id, req.user.id, body.values));
    return body;
  }

  @Get(':id/extensions')
  @ApiOperation({ operationId: 'getExtensions', description: 'Gets the configured and available extensions.' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the configuration.',
    required: true,
    type: Number,
  })
  @ApiOkResponse({ type: ExtensionsDto })
  async getExtensions(@Param('id') id: number) {
    const result: GetExtensionsResponse = await this.queryBus.execute(new GetExtensions(id, true));
    return ExtensionsDto.fromDomain(result.extensions, this.explorer.getExtensions().map(ConfiguredExtension.createInitial));
  }

  @Post(':id/extensions')
  @ApiOperation({ operationId: 'postExtension', description: 'Creates an extension.' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the configuration.',
    required: true,
    type: Number,
  })
  @ApiOkResponse({ type: ExtensionDto })
  @Role(BUILTIN_USER_GROUP_ADMIN)
  @UseGuards(RoleGuard)
  async postExtension(@Param('id') id: number, @Body() body: CreateExtensionDto) {
    const command = new CreateExtension(id, body);
    const result: CreateExtensionResponse = await this.commandBus.execute(command);

    return ExtensionDto.fromDomain(result.extension);
  }

  @Put(':id/extensions/:extensionId')
  @ApiOperation({ operationId: 'putExtension', description: 'Updates an extension.' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the configuration.',
    required: true,
    type: Number,
  })
  @ApiParam({
    name: 'extensionId',
    description: 'The ID of the extension.',
    required: true,
    type: Number,
  })
  @ApiOkResponse({ type: ExtensionDto })
  @Role(BUILTIN_USER_GROUP_ADMIN)
  @UseGuards(RoleGuard)
  async putExtension(@Param('id') id: number, @Param('extensionId') extensionId: number, @Body() body: UpdateExtensionDto) {
    const command = new UpdateExtension(+extensionId, body);

    const result: UpdateExtensionResponse = await this.commandBus.execute(command);

    return ExtensionDto.fromDomain(result.extension);
  }

  @Delete(':id/extensions/:extensionId')
  @ApiOperation({ operationId: 'deleteExtension', description: 'Deletes an extension.' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the configuration.',
    required: true,
    type: Number,
  })
  @ApiParam({
    name: 'extensionId',
    description: 'The ID of the extension.',
    required: true,
    type: Number,
  })
  @ApiNoContentResponse()
  @Role(BUILTIN_USER_GROUP_ADMIN)
  @UseGuards(RoleGuard)
  async deleteExtension(@Param('id') id: number, @Param('extensionId') extensionId: number) {
    const command = new DeleteExtension(+extensionId);

    await this.commandBus.execute(command);
  }

  @Get(':id/checkBucketAvailability/:type')
  @ApiOperation({
    operationId: 'getBucketAvailability',
    description: 'Checks if this configuration has a user or conversation bucket and if yes by which extension it is provided.',
  })
  @ApiParam({
    name: 'id',
    description: 'The ID of the configuration.',
    required: true,
    type: Number,
  })
  @ApiParam({
    name: 'type',
    description: 'The type of bucket (user or conversation).',
    required: true,
    enum: ['user', 'conversation'],
  })
  @ApiOkResponse({ type: BucketAvailabilityDto })
  async getBucketAvailability(
    @Param('id', ParseIntPipe) configurationId: number,
    @Param('type') bucketType: 'user' | 'conversation',
  ) {
    const query = new GetBucketAvailability(configurationId, bucketType);
    const result: GetBucketAvailabilityResponse = await this.queryBus.execute(query);

    return BucketAvailabilityDto.fromDomain(result);
  }

  @Post('/duplicate/:id')
  @ApiOperation({ operationId: 'duplicateConfiguration', description: 'Duplicate a configuration.' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the configuration to duplicate.',
    required: true,
    type: Number,
  })
  @ApiOkResponse({ type: ConfigurationDto })
  @Role(BUILTIN_USER_GROUP_ADMIN)
  @UseGuards(RoleGuard)
  async duplicate(@Param('id') id: number) {
    const command = new DuplicateConfiguration(id);

    const result: DuplicateConfigurationResponse = await this.commandBus.execute(command);

    return ConfigurationDto.fromDomain(result.configuration);
  }
}
