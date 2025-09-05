import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDefined, IsEnum, IsOptional, IsString } from 'class-validator';
import { VisibilityType } from 'src/domain/prompt';

export class CreatePromptCategoryDto {
  @ApiProperty({
    description: 'The label or display name of the prompt category.',
    required: true,
  })
  @IsDefined()
  @IsString()
  label!: string;

  @ApiProperty({
    description: 'The description of the prompt category.',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'The date of creation for a prompt category.',
    required: true,
  })
  creationDate!: Date;

  @ApiProperty({
    description: 'The visibility of the prompt category.',
    required: true,
    enum: VisibilityType,
  })
  @IsDefined()
  @IsEnum(VisibilityType)
  visibility!: VisibilityType;
}

export class PromptCategoryDto extends CreatePromptCategoryDto {
  @ApiProperty({
    description: 'The identifier of the prompt category.',
    required: true,
  })
  id!: string;
}

export class CreatePromptDto {
  @ApiProperty({
    description: 'The title of the prompt.',
    required: true,
  })
  @IsDefined()
  @IsString()
  title!: string;

  @ApiProperty({
    description: 'The description of the prompt.',
    required: false,
  })
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'The content or body of the prompt.',
    required: true,
  })
  @IsDefined()
  @IsString()
  content!: string;

  @ApiProperty({
    description: 'The ID of the categories this prompt belongs to.',
    required: false,
  })
  @IsOptional()
  @IsArray()
  categories?: [number];

  @ApiProperty({
    description: 'The visibility of the prompt (e.g., public, private).',
    required: true,
    enum: VisibilityType,
  })
  @IsDefined()
  @IsEnum(VisibilityType)
  visibility!: VisibilityType;
}

export class PromptDto extends CreatePromptDto {
  @ApiProperty({
    description: 'The identifier of the prompt.',
    required: true,
  })
  id!: string;

  @ApiProperty({
    description: 'The average rating of the prompt.',
    required: true,
  })
  rating!: number;
}
