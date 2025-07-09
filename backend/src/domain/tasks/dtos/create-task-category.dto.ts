import { IsHexColor, IsNumber, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class CreateTaskCategoryDto {
  @IsString()
  @Length(1, 100, { message: 'Name must be between 1 and 100 characters' })
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Description must not exceed 500 characters' })
  description?: string;

  @IsOptional()
  @IsString()
  @IsHexColor({ message: 'Color must be a valid hex color code' })
  color?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Sort order must be a number' })
  sortOrder?: number;
}
