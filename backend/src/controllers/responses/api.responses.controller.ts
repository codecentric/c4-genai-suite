import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags } from '@nestjs/swagger';
import { HealthCheck } from '@nestjs/terminus';
import { Request } from 'express';
import * as mime from 'mime-types';
import { Observable } from 'rxjs';
import { LocalAuthGuard } from '../../domain/auth';
import { SendMessage, SendMessageResponse, StartConversation, StartConversationResponse, StreamEvent } from '../../domain/chat';
import { GetExtensions, GetExtensionsResponse } from '../../domain/extensions';
import { GetFiles, GetFilesResponse, UploadFile, UploadFileResponse } from '../../domain/files';
import { UploadedFile as UploadedFileInternal } from '../../domain/files/interfaces';
import { FilesExtensionConfiguration } from '../../extensions/tools/files';
import { FilesVisionExtensionConfiguration } from '../../extensions/tools/files-vision';
import { WholeFilesExtensionConfiguration } from '../../extensions/tools/whole-files-conversation';
import { FilePurpose, ResponseCreateDto, ResponseDto } from './dtos';

@Controller('public/assistants/:assistantId')
@ApiTags('responses')
@UseGuards(LocalAuthGuard)
export class ApiResponsesController {
  private logger = new Logger(this.constructor.name);

  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  private getLlm(extensions: GetExtensionsResponse['extensions'], model?: string) {
    if (model != null) {
      const llm = extensions.find(
        (x) =>
          (x.spec.type === 'llm' && x.values.deploymentName === model) ||
          x.values.model === model ||
          x.values.modelName === model,
      );
      return llm?.spec.name;
    }
  }

  private setConfigurationValue<T extends string | number | undefined>(
    extensions: GetExtensionsResponse['extensions'],
    key: string,
    value: T,
    configuration: Record<number, Record<string, any>>,
  ) {
    if (value != null) {
      extensions
        .filter((x) => Object.keys(x.configurableArguments?.properties ?? {}).includes(key))
        .forEach((x) => {
          configuration[x.id] = configuration[x.id] ?? {};
          configuration[x.id][key] = value;
        });
    }
  }

  private getConfiguration(
    extensions: GetExtensionsResponse['extensions'],
    data: { temperature?: number; instructions?: string },
  ) {
    const configuration: Record<string, Record<string, any>> = {};
    this.setConfigurationValue(extensions, 'temperature', data.temperature, configuration);
    this.setConfigurationValue(extensions, 'text', data.instructions, configuration);
    return configuration;
  }

  private findBucketForAssistant(extensions: GetExtensionsResponse['extensions'], fileName: string, purpose: FilePurpose) {
    if (purpose === 'user_data') {
      const filesUser = extensions.find((x) => x.name === 'files-42');
      if (filesUser) {
        const { bucket } = filesUser.values as FilesExtensionConfiguration;
        return { bucketId: bucket, embedType: 'vector_and_text' as const };
      }
    }

    if (purpose === 'assistants') {
      const filesVision = extensions.find((x) => x.name === 'files-vision');
      if (filesVision) {
        const { fileNameExtensions } = filesVision.values as FilesVisionExtensionConfiguration;
        if (fileNameExtensions.find((x) => fileName.endsWith(x))) {
          return { embedType: 'none' as const };
        }
      }

      const filesWhole = extensions.find((x) => x.name === 'files-whole');
      if (filesWhole) {
        const { bucket } = filesWhole.values as WholeFilesExtensionConfiguration;
        return { bucketId: bucket, embedType: 'vector_and_text' as const };
      }
    }

    return {};
  }

  private getUserPrompts(request: ResponseCreateDto): string[] {
    if (typeof request.input === 'string') {
      return [request.input];
    }

    return request.input
      .filter((x) => x.role === 'user')
      .flatMap((userMessage) => {
        if (typeof userMessage.content === 'string') {
          return [userMessage.content];
        }

        return userMessage.content.filter((x) => x.type === 'input_text').map((part) => part.text);
      });
  }

  private getSystemMessages(request: ResponseCreateDto): string[] {
    const result = request.instructions ? [request.instructions] : [];

    if (typeof request.input === 'string') {
      return result;
    }

    const systemMessages = request.input.filter((x) => x.role === 'system');
    if (!systemMessages.length) {
      return result;
    }

    const systemMessageTexts = systemMessages.flatMap((x) => {
      if (typeof x.content === 'string') {
        return [x.content];
      } else {
        return x.content.filter((y) => y.type === 'input_text').map((y) => y.text);
      }
    });

    return result.concat(systemMessageTexts);
  }

  private async uploadFilesByData(
    request: ResponseCreateDto,
    user: Request['user'],
    extensions: GetExtensionsResponse['extensions'],
  ) {
    if (typeof request.input === 'string') {
      return [];
    }

    const files = request.input
      .filter((x) => x.role === 'user')
      .flatMap((x) =>
        typeof x.content !== 'string'
          ? x.content
              .filter((y) => y.type === 'input_file')
              .filter((y) => y.filename && y.file_data)
              .map((y) => {
                return { data: y.file_data!, name: y.filename! };
              })
          : [],
      );

    return await Promise.all(
      files.map(async ({ name, data }) => {
        const base64String = data.replace(/^data:[^;]+;base64,/, '');
        const buffer = Buffer.from(base64String, 'base64');

        const { bucketId, embedType } = this.findBucketForAssistant(extensions, name, 'assistants');
        if (!embedType) {
          throw new BadRequestException('files are not accepted');
        }

        const command = new UploadFile({
          buffer: buffer,
          mimeType: mime.lookup(name) as string,
          fileName: name,
          fileSize: buffer.length,
          user,
          bucketId,
          embedType,
        });
        const response: UploadFileResponse = await this.commandBus.execute(command);
        return response.file;
      }),
    );
  }

  private async getUploadedFiles(request: ResponseCreateDto, user: Request['user']): Promise<UploadedFileInternal[]> {
    if (typeof request.input === 'string') {
      return [];
    }

    const fileIds = request.input
      .filter((x) => x.role === 'user')
      .flatMap((x) =>
        typeof x.content !== 'string'
          ? x.content
              .filter((y) => y.type === 'input_file' || y.type === 'input_image')
              .filter((y) => y.file_id && !Number.isNaN(Number(y.file_id)))
              .map((y) => Number(y.file_id!))
          : [],
      );

    const { files }: GetFilesResponse = fileIds.length
      ? await this.queryBus.execute(new GetFiles({ user, bucketIdOrType: 'all', page: 0, files: fileIds }))
      : { files: [], total: 0 };

    return files;
  }

  private readStream(stream: Observable<StreamEvent>) {
    return new Promise<{ id: number; text: string; tokens: number }>((resolve, reject) => {
      const output = { id: 0, text: '', tokens: 0 };
      stream.subscribe({
        next: (event) => {
          if (event.type === 'chunk') {
            event.content.forEach((content) => {
              if (content.type === 'text') {
                output.text += content.text;
              }
            });
          }
          if (event.type === 'saved' && event.messageType === 'ai') {
            output.id = event.messageId;
          }

          if (event.type === 'completed') {
            output.tokens = event.metadata.tokenCount;
          }
        },
        error: (err: Error) => reject(err),
        complete: () => resolve(output),
      });
    });
  }

  private async getFiles(request: ResponseCreateDto, user: Request['user'], extensions: GetExtensionsResponse['extensions']) {
    // files uploaded via responses api (file_id)
    const uploadedFiles = await this.uploadFilesByData(request, user, extensions);
    // files uploaded via responses api (file_url)
    const files = await this.getUploadedFiles(request, user);

    return [...files, ...uploadedFiles];
  }

  @Post('/responses')
  @HealthCheck()
  async createResponse(
    @Body() request: ResponseCreateDto,
    @Param('assistantId', ParseIntPipe) assistantId: number,
    @Req() req: Request,
  ): Promise<ResponseDto> {
    const { extensions }: GetExtensionsResponse = await this.queryBus.execute(new GetExtensions(assistantId, true, true));
    const llm = this.getLlm(extensions, request.model);
    const configuration = this.getConfiguration(extensions, request);
    const userMessages = this.getUserPrompts(request);
    const systemMessages = this.getSystemMessages(request);
    const input = userMessages.join(' ');
    const files = await this.getFiles(request, req.user, extensions);

    const result: StartConversationResponse = await this.commandBus.execute(
      new StartConversation(req.user, { configurationId: assistantId, llm }),
    );
    const response: SendMessageResponse = await this.queryBus.execute(
      new SendMessage(result.conversation.id, req.user, input, files, undefined, systemMessages, configuration),
    );

    const output = await this.readStream(response.stream);

    const id = output.id;
    return {
      id: `resp_${id}`,
      object: 'response',
      created_at: Math.round(Date.now() / 1000),
      status: 'completed',
      background: false,
      model: request.model,
      output: [
        {
          id: `msg_${id}`,
          type: 'message',
          status: 'completed',
          content: [
            {
              type: 'output_text',
              annotations: [],
              text: output.text,
            },
          ],
          role: 'assistant',
        },
      ],
      parallel_tool_calls: true,
      service_tier: 'default',
      store: true,
      temperature: request.temperature ?? 1.0,
      text: {
        format: {
          type: 'text',
        },
      },
      tool_choice: 'auto',
      tools: [],
      top_p: 1.0,
      truncation: 'disabled',
      usage: {
        input_tokens: 0,
        input_tokens_details: {
          cached_tokens: 0,
        },
        output_tokens: output.tokens,
        output_tokens_details: {
          reasoning_tokens: 0,
        },
        total_tokens: output.tokens,
      },
      metadata: {},
    };
  }

  @Post('/files')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @Param('assistantId', ParseIntPipe) assistantId: number,
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
    @Body('purpose') purpose: FilePurpose,
  ) {
    if (!file || !purpose) {
      throw new BadRequestException('file is missing');
    }

    const result: GetExtensionsResponse = await this.queryBus.execute(new GetExtensions(assistantId, true, true));
    const { bucketId, embedType } = this.findBucketForAssistant(result.extensions, file.originalname, purpose);
    if (!embedType) {
      throw new BadRequestException('files are not accepted');
    }

    const extension = file.originalname.substring(file.originalname.lastIndexOf('.') + 1).toLowerCase();
    const command = new UploadFile({
      buffer: file.buffer,
      mimeType: mime.lookup(extension) as string,
      fileName: file.originalname,
      fileSize: file.size,
      user: req.user,
      bucketId,
      embedType,
    });

    const uploaded: UploadFileResponse = await this.commandBus.execute(command);

    return {
      object: 'file',
      id: String(uploaded.file.id),
      purpose: purpose,
      filename: file.filename,
      bytes: file.size,
      created_at: Math.round(uploaded.file.uploadedAt.getTime() / 1000),
      status: 'processed',
      status_details: null,
    };
  }
}
