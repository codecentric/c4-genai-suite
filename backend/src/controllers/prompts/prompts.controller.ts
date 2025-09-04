import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreatePromptCategoryDto, CreatePromptDto, PromptCategoryDto, PromptDto } from './dtos/index';

@Controller('prompt')
export class PromptController {
  @Post('categories')
  @ApiOperation({ operationId: 'postPromptCategory', summary: 'Create a new prompt category' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  async createPromptCategory(@Body() createPromptCategoryDto: CreatePromptCategoryDto): Promise<PromptCategoryDto> {
    return Promise.resolve(undefined as unknown as PromptCategoryDto);
  }

  @Get('categories')
  @ApiOperation({ operationId: 'getPromptCategory', summary: 'Get a prompt category' })
  @ApiResponse({ status: 200, type: PromptCategoryDto })
  async getPromptCategory(@Param('id') id: number): Promise<PromptCategoryDto> {
    return Promise.resolve(id as unknown as PromptCategoryDto);
  }

  @Post()
  @ApiOperation({ operationId: 'postPrompt', summary: 'Create a new prompt' })
  @ApiResponse({ status: 201, description: 'Prompt created successfully' })
  async createPrompt(@Body() createPromptDto: CreatePromptDto): Promise<PromptDto> {
    return Promise.resolve(undefined as unknown as PromptDto);
  }

  @Get()
  @ApiOperation({ operationId: 'getPrompt', summary: 'Get a prompt' })
  @ApiResponse({ status: 200, type: PromptDto })
  async getPrompt(@Param('id') id: number): Promise<PromptDto> {
    return Promise.resolve(id as unknown as PromptDto);
  }
}
