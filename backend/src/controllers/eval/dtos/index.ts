import { ApiProperty } from '@nestjs/swagger';

export class EvalServiceStatusDto {
  @ApiProperty({
    description: 'Whether the evaluation service is enabled and available for use.',
    required: true,
    example: true,
  })
  available!: boolean;
}
