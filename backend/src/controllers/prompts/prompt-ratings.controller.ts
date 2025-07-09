import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { LocalAuthGuard } from '../../domain/auth';
import { UserEntity } from '../../domain/database';
import { CreatePromptRatingDto, UpdatePromptRatingDto } from '../../domain/prompts';
import { PromptRatingsService } from '../../domain/prompts/prompt-ratings.service';

@ApiTags('prompt-ratings')
@UseGuards(LocalAuthGuard)
@Controller('prompts/:promptId/ratings')
export class PromptRatingsController {
  constructor(private readonly promptRatingsService: PromptRatingsService) {}

  @Post()
  @ApiOperation({ summary: 'Rate a prompt' })
  @ApiResponse({ status: 201, description: 'Rating created successfully' })
  @ApiResponse({ status: 400, description: 'User has already rated this prompt' })
  async create(
    @Param('promptId', ParseIntPipe) promptId: number,
    @Req() req: Request,
    @Body() createPromptRatingDto: CreatePromptRatingDto,
  ) {
    const user = req.user as UserEntity;
    return this.promptRatingsService.create(promptId, user.id, createPromptRatingDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all ratings for a prompt' })
  @ApiResponse({ status: 200, description: 'List of ratings' })
  async findByPrompt(@Param('promptId', ParseIntPipe) promptId: number) {
    return this.promptRatingsService.findByPrompt(promptId);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get current user rating for a prompt' })
  @ApiResponse({ status: 200, description: 'User rating' })
  @ApiResponse({ status: 404, description: 'Rating not found' })
  async findMyRating(@Param('promptId', ParseIntPipe) promptId: number, @Req() req: Request) {
    const user = req.user as UserEntity;
    const rating = await this.promptRatingsService.findUserRating(promptId, user.id);
    if (!rating) {
      throw new Error('Rating not found');
    }
    return rating;
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get rating statistics for a prompt' })
  @ApiResponse({ status: 200, description: 'Rating statistics' })
  async getStats(@Param('promptId', ParseIntPipe) promptId: number) {
    return this.promptRatingsService.getPromptRatingStats(promptId);
  }

  @Put()
  @ApiOperation({ summary: 'Update user rating for a prompt' })
  @ApiResponse({ status: 200, description: 'Rating updated successfully' })
  @ApiResponse({ status: 404, description: 'Rating not found' })
  async update(
    @Param('promptId', ParseIntPipe) promptId: number,
    @Req() req: Request,
    @Body() updatePromptRatingDto: UpdatePromptRatingDto,
  ) {
    const user = req.user as UserEntity;
    return this.promptRatingsService.update(promptId, user.id, updatePromptRatingDto);
  }

  @Delete()
  @ApiOperation({ summary: 'Delete user rating for a prompt' })
  @ApiResponse({ status: 200, description: 'Rating deleted successfully' })
  @ApiResponse({ status: 404, description: 'Rating not found' })
  async delete(@Param('promptId', ParseIntPipe) promptId: number, @Req() req: Request) {
    const user = req.user as UserEntity;
    await this.promptRatingsService.delete(promptId, user.id);
    return { message: 'Rating deleted successfully' };
  }
}
