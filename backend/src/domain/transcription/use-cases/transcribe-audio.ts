import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { User } from 'src/domain/users';
import { TranscribeExtensionConfiguration } from '../../../extensions/other/azure-transcribe';
import { GetExtension, GetExtensionResponse } from '../../extensions';
import { AzureTranscriptionProvider } from '../providers';

export interface TranscribeAudioParams {
  user: User;
  extensionId: number;
  audioBuffer: Buffer;
  fileName: string;
  mimeType: string;
}

export class TranscribeAudio {
  constructor(public readonly params: TranscribeAudioParams) {}
}

export class TranscribeAudioResponse {
  constructor(public readonly text: string) {}
}

@CommandHandler(TranscribeAudio)
export class TranscribeAudioHandler implements ICommandHandler<TranscribeAudio, TranscribeAudioResponse> {
  private readonly logger = new Logger(TranscribeAudioHandler.name);

  constructor(private readonly queryBus: QueryBus) {}

  async execute(command: TranscribeAudio): Promise<TranscribeAudioResponse> {
    const { user, extensionId, audioBuffer, fileName, mimeType } = command.params;

    this.logger.log(`Transcribing audio,, file: ${fileName}, size: ${audioBuffer.length} bytes`);

    const extensionResult: GetExtensionResponse = await this.queryBus.execute(new GetExtension({ id: extensionId }));

    if (!extensionResult.extension || !extensionResult.extension.enabled) {
      throw new NotFoundException('Transcribe extension not found or not enabled');
    }

    const configuration = extensionResult.extension.values as TranscribeExtensionConfiguration;

    // Validate file size (Whisper has a 25MB limit)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (audioBuffer.length > maxSize) {
      throw new BadRequestException(
        `Audio file too large. Maximum size is 25MB, received ${(audioBuffer.length / 1024 / 1024).toFixed(2)}MB`,
      );
    }

    const supportedMimeTypes = ['audio/mp3', 'audio/mp4', 'audio/mpeg', 'audio/mpga', 'audio/m4a', 'audio/wav', 'audio/webm'];

    if (!supportedMimeTypes.includes(mimeType)) {
      throw new BadRequestException(`Unsupported audio format: ${mimeType}`);
    }

    try {
      const provider = new AzureTranscriptionProvider(configuration);

      const text = await provider.transcribe(audioBuffer, fileName, mimeType);

      return new TranscribeAudioResponse(text);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error transcribing audio for user ${user.id}: ${error.message}`, error.stack);
        throw new BadRequestException(`Failed to transcribe audio: ${error.message}`);
      }
      throw new BadRequestException('Failed to transcribe audio');
    }
  }
}
