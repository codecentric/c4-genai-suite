import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PromptRatingEntity } from '../database';
import { CreatePromptRatingDto, UpdatePromptRatingDto } from './interfaces';
import { PromptsService } from './prompts.service';

@Injectable()
export class PromptRatingsService {
  constructor(
    @InjectRepository(PromptRatingEntity)
    private readonly promptRatingRepository: Repository<PromptRatingEntity>,
    private readonly promptsService: PromptsService,
  ) {}

  async create(promptId: number, userId: string, createPromptRatingDto: CreatePromptRatingDto): Promise<PromptRatingEntity> {
    // Check if user already rated this prompt
    const existingRating = await this.promptRatingRepository.findOne({
      where: { promptId, userId },
    });

    if (existingRating) {
      throw new Error('User has already rated this prompt');
    }

    const rating = this.promptRatingRepository.create({
      ...createPromptRatingDto,
      promptId,
      userId,
    });

    const savedRating = await this.promptRatingRepository.save(rating);

    // Update prompt rating statistics
    await this.promptsService.updateRatingStats(promptId);

    return savedRating;
  }

  async update(promptId: number, userId: string, updatePromptRatingDto: UpdatePromptRatingDto): Promise<PromptRatingEntity> {
    const rating = await this.promptRatingRepository.findOne({
      where: { promptId, userId },
    });

    if (!rating) {
      throw new Error('Rating not found');
    }

    Object.assign(rating, updatePromptRatingDto);
    const updatedRating = await this.promptRatingRepository.save(rating);

    // Update prompt rating statistics
    await this.promptsService.updateRatingStats(promptId);

    return updatedRating;
  }

  async delete(promptId: number, userId: string): Promise<void> {
    const result = await this.promptRatingRepository.delete({ promptId, userId });

    if (result.affected === 0) {
      throw new Error('Rating not found');
    }

    // Update prompt rating statistics
    await this.promptsService.updateRatingStats(promptId);
  }

  async findByPrompt(promptId: number): Promise<PromptRatingEntity[]> {
    return this.promptRatingRepository.find({
      where: { promptId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async findUserRating(promptId: number, userId: string): Promise<PromptRatingEntity | null> {
    return this.promptRatingRepository.findOne({
      where: { promptId, userId },
      relations: ['user'],
    });
  }

  async getPromptRatingStats(promptId: number): Promise<{
    averageRating: number;
    ratingCount: number;
    ratingDistribution: { [key: number]: number };
  }> {
    const ratings = await this.promptRatingRepository.find({
      where: { promptId },
    });

    const ratingCount = ratings.length;
    const averageRating = ratingCount > 0 ? ratings.reduce((sum, rating) => sum + rating.rating, 0) / ratingCount : 0;

    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach((rating) => {
      ratingDistribution[rating.rating as keyof typeof ratingDistribution]++;
    });

    return {
      averageRating: Math.round(averageRating * 100) / 100,
      ratingCount,
      ratingDistribution,
    };
  }
}
