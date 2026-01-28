import { BadRequestException, Logger } from '@nestjs/common';
import { AzureOpenAI } from 'openai';
import { TranscribeExtensionConfiguration } from '../../../extensions/other/azure-transcribe';

export class AzureTranscriptionProvider {
  private readonly logger = new Logger(AzureTranscriptionProvider.name);
  private readonly client: AzureOpenAI;

  constructor(config: TranscribeExtensionConfiguration) {
    if (!config.apiKey) {
      throw new BadRequestException('API key is required');
    }
    if (!config.instanceName) {
      throw new BadRequestException('Instance name is required');
    }
    if (!config.deploymentName) {
      throw new BadRequestException('Deployment name is required');
    }
    if (!config.apiVersion) {
      throw new BadRequestException('API version is required');
    }

    const endpoint = `https://${config.instanceName}.openai.azure.com/`;

    this.client = new AzureOpenAI({
      apiKey: config.apiKey,
      endpoint: endpoint,
      apiVersion: config.apiVersion,
      deployment: config.deploymentName,
    });
  }

  async transcribe(audioBuffer: Buffer, fileName: string, mimeType: string): Promise<string> {
    try {
      // Create a File object from the buffer
      const audioFile = new File([new Uint8Array(audioBuffer)], fileName, { type: mimeType });

      // Call Azure OpenAI Whisper API
      const result = await this.client.audio.transcriptions.create({
        file: audioFile,
        model: '',
      });

      this.logger.log(`Azure transcription successful, text length: ${result.text.length}`);
      return result.text;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Azure transcription error: ${error.message}`, error.stack);
        throw new BadRequestException(`Azure transcription failed: ${error.message}`);
      }
      throw new BadRequestException('Azure transcription failed');
    }
  }
}
