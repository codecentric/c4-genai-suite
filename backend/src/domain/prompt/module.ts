import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PromptCategoryEntity } from '../database/entities/prompt-category';
import { PromptEntity } from '../database/entities/prompt';
import { CreatePromptHandler } from './use-cases/create-prompt';

@Module({
  imports: [CqrsModule, TypeOrmModule.forFeature([PromptEntity, PromptCategoryEntity])],
  providers: [CreatePromptHandler],
  exports: [CreatePromptHandler],
})
export class PromptModule {}
