import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { LocalAuthGuard } from '../../domain/auth';
import { UserEntity } from '../../domain/database';
import { CreatePromptDto, PaginationOptions, PromptFilters, UpdatePromptDto } from '../../domain/prompts/interfaces';
import { PromptsService } from '../../domain/prompts/prompts.service';

@ApiTags('prompts')
@UseGuards(LocalAuthGuard)
@Controller('prompts')
export class PromptsController {
  constructor(private readonly promptsService: PromptsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new prompt' })
  @ApiResponse({ status: 201, description: 'Prompt created successfully' })
  async create(@Req() req: Request, @Body() createPromptDto: CreatePromptDto) {
    const user = req.user as UserEntity;
    return this.promptsService.create(user.id, createPromptDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all public prompts and own private prompts' })
  @ApiResponse({ status: 200, description: 'List of prompts' })
  async findAll(
    @Req() req: Request,
    @Query('categoryId') categoryId?: number,
    @Query('search') search?: string,
    @Query('minRating') minRating?: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: 'createdAt' | 'updatedAt' | 'averageRating' | 'usageCount' | 'title',
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    const user = req.user as UserEntity;
    const filters: PromptFilters = {
      categoryId,
      search,
      minRating,
    };

    const pagination: PaginationOptions = {
      page,
      limit,
      sortBy,
      sortOrder,
    };

    return this.promptsService.findAll(filters, pagination, user?.id);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get current user prompts' })
  @ApiResponse({ status: 200, description: 'List of user prompts' })
  async findMy(
    @Req() req: Request,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: 'createdAt' | 'updatedAt' | 'averageRating' | 'usageCount' | 'title',
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    const user = req.user as UserEntity;
    const pagination: PaginationOptions = {
      page,
      limit,
      sortBy,
      sortOrder,
    };

    return this.promptsService.findByAuthor(user.id, pagination);
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular prompts' })
  @ApiResponse({ status: 200, description: 'List of popular prompts' })
  async getPopular(@Query('limit') limit?: number) {
    return this.promptsService.getPopularPrompts(limit);
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recent prompts' })
  @ApiResponse({ status: 200, description: 'List of recent prompts' })
  async getRecent(@Query('limit') limit?: number) {
    return this.promptsService.getRecentPrompts(limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get prompt by ID' })
  @ApiResponse({ status: 200, description: 'Prompt details' })
  @ApiResponse({ status: 404, description: 'Prompt not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const prompt = await this.promptsService.findOne(id);
    if (!prompt) {
      throw new Error('Prompt not found');
    }
    return prompt;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update prompt (creates new version)' })
  @ApiResponse({ status: 200, description: 'Prompt updated successfully' })
  @ApiResponse({ status: 404, description: 'Prompt not found' })
  async update(@Param('id', ParseIntPipe) id: number, @Req() req: Request, @Body() updatePromptDto: UpdatePromptDto) {
    const user = req.user as UserEntity;
    return this.promptsService.createVersion(id, user.id, updatePromptDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete prompt' })
  @ApiResponse({ status: 200, description: 'Prompt deleted successfully' })
  @ApiResponse({ status: 404, description: 'Prompt not found' })
  async delete(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const user = req.user as UserEntity;
    await this.promptsService.delete(id, user.id);
    return { message: 'Prompt deleted successfully' };
  }

  @Post(':id/clone')
  @ApiOperation({ summary: 'Clone a prompt' })
  @ApiResponse({ status: 201, description: 'Prompt cloned successfully' })
  @ApiResponse({ status: 404, description: 'Prompt not found' })
  async clone(@Param('id', ParseIntPipe) id: number, @Req() req: Request, @Body('title') title?: string) {
    const user = req.user as UserEntity;
    return this.promptsService.clone(id, user.id, title);
  }

  @Post(':id/use')
  @ApiOperation({ summary: 'Record prompt usage' })
  @ApiResponse({ status: 200, description: 'Usage recorded successfully' })
  async recordUsage(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const user = req.user as UserEntity;
    await this.promptsService.recordUsage(id, user.id);
    return { message: 'Usage recorded successfully' };
  }

  @Put(':id/visibility')
  @ApiOperation({ summary: 'Toggle prompt visibility (public/private)' })
  @ApiResponse({ status: 200, description: 'Visibility updated successfully' })
  @ApiResponse({ status: 404, description: 'Prompt not found' })
  async toggleVisibility(@Param('id', ParseIntPipe) id: number, @Req() req: Request, @Body('isPublic') isPublic: boolean) {
    const user = req.user as UserEntity;
    return this.promptsService.update(id, user.id, { isPublic });
  }

  // Versioning endpoints
  @Get(':id/versions')
  @ApiOperation({ summary: 'Get all versions of a prompt' })
  @ApiResponse({ status: 200, description: 'List of prompt versions' })
  async getVersions(@Param('id', ParseIntPipe) id: number) {
    return this.promptsService.getVersions(id);
  }

  @Get(':id/versions/:version')
  @ApiOperation({ summary: 'Get specific version of a prompt' })
  @ApiResponse({ status: 200, description: 'Prompt version details' })
  @ApiResponse({ status: 404, description: 'Version not found' })
  async getVersion(@Param('id', ParseIntPipe) id: number, @Param('version', ParseIntPipe) version: number) {
    const promptVersion = await this.promptsService.getVersion(id, version);
    if (!promptVersion) {
      throw new Error('Version not found');
    }
    return promptVersion;
  }

  @Post(':id/restore/:version')
  @ApiOperation({ summary: 'Restore a specific version of a prompt' })
  @ApiResponse({ status: 200, description: 'Version restored successfully' })
  @ApiResponse({ status: 404, description: 'Version not found' })
  async restoreVersion(
    @Param('id', ParseIntPipe) id: number,
    @Param('version', ParseIntPipe) version: number,
    @Req() req: Request,
    @Body('versionComment') versionComment: string,
  ) {
    const user = req.user as UserEntity;
    return this.promptsService.restoreVersion(id, version, user.id, versionComment);
  }
}
