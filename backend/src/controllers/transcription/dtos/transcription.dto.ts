import { ApiProperty } from '@nestjs/swagger';

export class TranscriptionDto {
  @ApiProperty({
    description: 'The transcribed text from the audio',
    example: 'Hello, this is a test transcription.',
  })
  text!: string;

  static fromDomain(text: string): TranscriptionDto {
    const dto = new TranscriptionDto();
    dto.text = text;
    return dto;
  }
}
