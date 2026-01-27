import { BadRequestException, Logger } from '@nestjs/common';
import { AzureOpenAI } from 'openai';
import { DictateExtensionConfiguration } from '../../../extensions/other/azure-dictate';

export class AzureTranscriptionProvider {
  private readonly logger = new Logger(AzureTranscriptionProvider.name);
  private readonly client: AzureOpenAI;

  constructor(config: DictateExtensionConfiguration) {
    if (!config.apiKey) {
      throw new BadRequestException('API key is required');
    }
    if (!config.instanceName) {
      throw new BadRequestException('Instance name is required');
    }
    if (!config.deploymentName) {
      throw new BadRequestException('Deployment name is required');
    }

    const endpoint = `https://${config.instanceName}.openai.azure.com/`;
    const apiVersion = '2024-06-01';

    this.client = new AzureOpenAI({
      apiKey: config.apiKey,
      endpoint: endpoint,
      apiVersion: apiVersion,
      deployment: config.deploymentName,
    });
  }

  async transcribe(audioBuffer: Buffer, fileName: string, mimeType: string, language?: string): Promise<string> {
    try {
      // Create a File object from the buffer
      const audioFile = new File([new Uint8Array(audioBuffer)], fileName, { type: mimeType });

      // Call Azure OpenAI Whisper API
      const result = await this.client.audio.transcriptions.create({
        file: audioFile,
        model: '',
        language: language || undefined,
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
