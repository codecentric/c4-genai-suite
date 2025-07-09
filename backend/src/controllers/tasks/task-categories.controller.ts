import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreatePromptCategoryDto, UpdatePromptCategoryDto } from '../../domain/prompts/interfaces';
import { PromptCategoriesService } from '../../domain/prompts/prompt-categories.service';

@ApiTags('prompt-categories')
@Controller('prompt-categories')
export class TaskCategoriesController {
  constructor(private readonly promptCategoriesService: PromptCategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new prompt category' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  async create(@Body() createPromptCategoryDto: CreatePromptCategoryDto) {
    return this.promptCategoriesService.create(createPromptCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all prompt categories' })
  @ApiResponse({ status: 200, description: 'List of categories' })
  async findAll() {
    return this.promptCategoriesService.findAll();
  }

  @Get('with-counts')
  @ApiOperation({ summary: 'Get all categories with prompt counts' })
  @ApiResponse({ status: 200, description: 'List of categories with prompt counts' })
  async findAllWithCounts() {
    return this.promptCategoriesService.getCategoriesWithPromptCount();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiResponse({ status: 200, description: 'Category details' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const category = await this.promptCategoriesService.findOne(id);
    if (!category) {
      throw new Error('Category not found');
    }
    return category;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update category' })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() updatePromptCategoryDto: UpdatePromptCategoryDto) {
    return this.promptCategoriesService.update(id, updatePromptCategoryDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete category' })
  @ApiResponse({ status: 200, description: 'Category deleted successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.promptCategoriesService.delete(id);
    return { message: 'Category deleted successfully' };
  }
}
