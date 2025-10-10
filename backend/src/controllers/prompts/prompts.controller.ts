import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreatePrompt, CreatePromptResponse } from 'src/domain/prompt/use-cases/create-prompt';
import { CreatePrompt, CreatePromptResponse } from 'src/domain/prompt/use-cases/create-prompt';
import { LocalAuthGuard } from '../../domain/auth';
import { CreatePromptCategoryDto, CreatePromptDto, PromptCategoryDto, PromptDto } from './dtos';

@Controller('prompt')
@ApiTags('prompts')
@UseGuards(LocalAuthGuard)
export class PromptController {
  constructor(private readonly commandBus: CommandBus) {}

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
    const response: CreatePromptResponse = await this.commandBus.execute(
      new CreatePrompt({
        title: createPromptDto.title,
        description: createPromptDto.description,
        content: createPromptDto.content,
        visibility: createPromptDto.visibility,
        categoryLabels: createPromptDto.categories,
      }),
    );

    // Map entity to DTO using fromDomain method
    return PromptDto.fromDomain(response.prompt);
  }

  @Get()
  @ApiOperation({ operationId: 'getPrompt', summary: 'Get a prompt' })
  @ApiResponse({ status: 200, type: PromptDto })
  async getPrompt(@Param('id') id: number): Promise<PromptDto> {
    return Promise.resolve(id as unknown as PromptDto);
  }
}
