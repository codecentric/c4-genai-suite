import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PromptCategoryEntity, PromptEntity, PromptRatingEntity, PromptUsageEntity, PromptVersionEntity } from '../database';
import { PromptCategoriesService } from './prompt-categories.service';
import { PromptRatingsService } from './prompt-ratings.service';
import { PromptsService } from './prompts.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PromptEntity, PromptCategoryEntity, PromptRatingEntity, PromptUsageEntity, PromptVersionEntity]),
  ],
  providers: [PromptsService, PromptCategoriesService, PromptRatingsService],
  exports: [PromptsService, PromptCategoriesService, PromptRatingsService],
})
export class PromptsModule {}
