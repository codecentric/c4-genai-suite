import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { User } from 'src/domain/users';
import { TranscribeExtensionConfiguration } from '../../../extensions/other/azure-transcribe';
import { AzureTranscriptionProvider } from '../providers';
import { TranscribeAudio, TranscribeAudioHandler } from './transcribe-audio';

jest.mock('../providers/azure-provider');

describe('Transcribe Audio', () => {
  let handler: TranscribeAudioHandler;
  let queryBus: QueryBus;

  const mockUser: User = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    userGroupIds: ['1'],
  };

  const mockConfig: TranscribeExtensionConfiguration = {
    apiKey: 'test-api-key',
    instanceName: 'test-instance',
    deploymentName: 'whisper',
    apiVersion: '2024-06-01',
  };

  const mockAudioBuffer = Buffer.from('fake-audio-data');
  const mockFileName = 'test-audio.mp3';
  const mockMimeType = 'audio/mp3';

  beforeEach(() => {
    queryBus = {
      execute: jest.fn(),
    } as unknown as QueryBus;

    handler = new TranscribeAudioHandler(queryBus);

    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('should successfully transcribe audio', async () => {
      const mockTranscription = 'This is the transcribed text';

      const mockExtensionResponse = {
        extension: {
          id: 1,
          externalId: 'ext-1',
          enabled: true,
          values: mockConfig,
        },
      };
      const executeSpy = jest.spyOn(queryBus, 'execute').mockResolvedValue(mockExtensionResponse);

      const mockTranscribe = jest.fn().mockResolvedValue(mockTranscription);
      (AzureTranscriptionProvider as jest.Mock).mockImplementation(() => ({
        transcribe: mockTranscribe,
      }));

      const command = new TranscribeAudio({
        user: mockUser,
        extensionId: 1,
        audioBuffer: mockAudioBuffer,
        fileName: mockFileName,
        mimeType: mockMimeType,
      });

      const result = await handler.execute(command);

      expect(result.text).toBe(mockTranscription);
      expect(executeSpy).toHaveBeenCalledWith(expect.objectContaining({ filter: { id: 1 } }));
      expect(AzureTranscriptionProvider).toHaveBeenCalledTimes(1);
      expect(mockTranscribe).toHaveBeenCalledWith(mockAudioBuffer, mockFileName, mockMimeType);
    });

    it('should throw NotFoundException when extension is not found', async () => {
      const mockExtensionResponse = {
        extension: {
          id: 1,
          externalId: 'ext-1',
          enabled: false,
          values: mockConfig,
        },
      };
      jest.spyOn(queryBus, 'execute').mockResolvedValue(mockExtensionResponse);

      const command = new TranscribeAudio({
        user: mockUser,
        extensionId: 1,
        audioBuffer: mockAudioBuffer,
        fileName: mockFileName,
        mimeType: mockMimeType,
      });

      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
      await expect(handler.execute(command)).rejects.toThrow('Transcribe extension not found or not enabled');
    });

    it('should throw BadRequestException when audio file is too large', async () => {
      const mockExtensionResponse = {
        extension: {
          id: 1,
          externalId: 'ext-1',
          enabled: true,
          values: mockConfig,
        },
      };
      jest.spyOn(queryBus, 'execute').mockResolvedValue(mockExtensionResponse);

      const largeBuffer = Buffer.alloc(26 * 1024 * 1024); // 26MB

      const command = new TranscribeAudio({
        user: mockUser,
        extensionId: 1,
        audioBuffer: largeBuffer,
        fileName: mockFileName,
        mimeType: mockMimeType,
      });

      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(command)).rejects.toThrow('Audio file too large');
    });

    it('should throw BadRequestException for unsupported mime type', async () => {
      const mockExtensionResponse = {
        extension: {
          id: 1,
          externalId: 'ext-1',
          enabled: true,
          values: mockConfig,
        },
      };
      jest.spyOn(queryBus, 'execute').mockResolvedValue(mockExtensionResponse);

      const command = new TranscribeAudio({
        user: mockUser,
        extensionId: 1,
        audioBuffer: mockAudioBuffer,
        fileName: 'test.txt',
        mimeType: 'text/plain',
      });

      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(command)).rejects.toThrow('Unsupported audio format');
    });

    it('should throw BadRequestException when transcription fails', async () => {
      const mockExtensionResponse = {
        extension: {
          id: 1,
          externalId: 'ext-1',
          enabled: true,
          values: mockConfig,
        },
      };
      jest.spyOn(queryBus, 'execute').mockResolvedValue(mockExtensionResponse);

      const mockError = new Error('Azure API error');
      const mockTranscribe = jest.fn().mockRejectedValue(mockError);
      (AzureTranscriptionProvider as jest.Mock).mockImplementation(() => ({
        transcribe: mockTranscribe,
      }));

      const command = new TranscribeAudio({
        user: mockUser,
        extensionId: 1,
        audioBuffer: mockAudioBuffer,
        fileName: mockFileName,
        mimeType: mockMimeType,
      });

      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(command)).rejects.toThrow('Failed to transcribe audio');
    });

    it('should support all valid mime types', async () => {
      const validMimeTypes = ['audio/mp3', 'audio/mp4', 'audio/mpeg', 'audio/mpga', 'audio/m4a', 'audio/wav', 'audio/webm'];

      const mockExtensionResponse = {
        extension: {
          id: 1,
          externalId: 'ext-1',
          enabled: true,
          values: mockConfig,
        },
      };
      jest.spyOn(queryBus, 'execute').mockResolvedValue(mockExtensionResponse);

      const mockTranscribe = jest.fn().mockResolvedValue('transcription');
      (AzureTranscriptionProvider as jest.Mock).mockImplementation(() => ({
        transcribe: mockTranscribe,
      }));

      for (const mimeType of validMimeTypes) {
        const command = new TranscribeAudio({
          user: mockUser,
          extensionId: 1,
          audioBuffer: mockAudioBuffer,
          fileName: `test.${mimeType.split('/')[1]}`,
          mimeType,
        });

        await expect(handler.execute(command)).resolves.toBeDefined();
      }
    });

    it('should pass apiVersion to Azure provider', async () => {
      const mockTranscription = 'Transcribed text';
      const configWithCustomApiVersion = { ...mockConfig, apiVersion: '2025-03-01-preview' };

      const mockExtensionResponse = {
        extension: {
          id: 1,
          externalId: 'ext-1',
          enabled: true,
          values: configWithCustomApiVersion,
        },
      };
      jest.spyOn(queryBus, 'execute').mockResolvedValue(mockExtensionResponse);

      const mockTranscribe = jest.fn().mockResolvedValue(mockTranscription);
      (AzureTranscriptionProvider as jest.Mock).mockImplementation(() => ({
        transcribe: mockTranscribe,
      }));

      const command = new TranscribeAudio({
        user: mockUser,
        extensionId: 1,
        audioBuffer: mockAudioBuffer,
        fileName: mockFileName,
        mimeType: mockMimeType,
      });

      await handler.execute(command);

      expect(AzureTranscriptionProvider).toHaveBeenCalledWith(configWithCustomApiVersion);
    });
  });
});
