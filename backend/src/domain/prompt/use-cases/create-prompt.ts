import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PromptCategoryEntity } from '../../database/entities/prompt-category';
import { PromptEntity } from '../../database/entities/prompt';
import { assignDefined } from 'src/lib';
import { Prompt } from '../interfaces';

type Values = Pick<Prompt, 'title' | 'description' | 'content' | 'visibility'> & {
  categoryLabels?: string[];
};

export class CreatePrompt {
  constructor(public readonly values: Values) {}
}

export class CreatePromptResponse {
  constructor(public readonly prompt: PromptEntity) {}
}

@CommandHandler(CreatePrompt)
export class CreatePromptHandler implements ICommandHandler<CreatePrompt, CreatePromptResponse> {
  constructor(
    @InjectRepository(PromptEntity)
    private readonly promptRepository: Repository<PromptEntity>,
    @InjectRepository(PromptCategoryEntity)
    private readonly categoryRepository: Repository<PromptCategoryEntity>,
  ) {}

  async execute(request: CreatePrompt): Promise<CreatePromptResponse> {
    const { values } = request;
    const { title, description, content, visibility, categoryLabels } = values;

    // Find existing categories if categoryLabels provided
    let categories: PromptCategoryEntity[] = [];
    if (categoryLabels && categoryLabels.length > 0) {
      categories = await this.categoryRepository.findBy({
        label: In(categoryLabels),
      });
    }

    // Create the prompt entity
    const promptData: Partial<PromptEntity> = {
      title,
      content,
      visibility,
      categories,
    };

    // Assign optional fields manually to avoid updating unexpected values
    assignDefined(promptData, { description });

    const entity = this.promptRepository.create(promptData);
    const created = await this.promptRepository.save(entity);

    return new CreatePromptResponse(created);
  }
}
