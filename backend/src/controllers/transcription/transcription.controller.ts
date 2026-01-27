import {
  BadRequestException,
  Controller,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { LocalAuthGuard } from 'src/domain/auth';
import { TranscribeAudio, TranscribeAudioResponse } from 'src/domain/transcription';
import { TranscriptionDto } from './dtos';

@Controller('transcription')
@ApiTags('transcription')
@UseGuards(LocalAuthGuard)
export class TranscriptionController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post('')
  @ApiOperation({
    operationId: 'transcribeAudio',
    description: 'Transcribes an audio file to text using OpenAI Whisper.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        audio: {
          type: 'string',
          format: 'binary',
          description: 'Audio file to transcribe (max 25MB)',
        },
      },
      required: ['audio'],
    },
  })
  @ApiQuery({
    name: 'extensionId',
    required: true,
    type: 'number',
    description: 'ID of the Dictate extension configuration to use',
  })
  @UseInterceptors(FileInterceptor('audio'))
  @ApiOkResponse({ type: TranscriptionDto })
  async transcribeAudio(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
    @Query('extensionId', ParseIntPipe) extensionId: number,
  ): Promise<TranscriptionDto> {
    if (!file) {
      throw new BadRequestException('No audio file provided');
    }

    const command = new TranscribeAudio({
      user: req.user,
      extensionId,
      audioBuffer: file.buffer,
      fileName: file.originalname,
      mimeType: file.mimetype,
    });

    const result: TranscribeAudioResponse = await this.commandBus.execute(command);

    return TranscriptionDto.fromDomain(result.text);
  }
}
