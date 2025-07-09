import { IsBoolean, IsNumber, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class UpdatePromptDto {
  @IsOptional()
  @IsString()
  @Length(1, 200, { message: 'Title must be between 1 and 200 characters' })
  title?: string;

  @IsOptional()
  @IsString()
  @Length(1, 10000, { message: 'Content must be between 1 and 10000 characters' })
  content?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Description must not exceed 1000 characters' })
  description?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Category ID must be a number' })
  categoryId?: number;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsString()
  @Length(1, 500, { message: 'Version comment must be between 1 and 500 characters' })
  versionComment?: string;
}
