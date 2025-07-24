import {
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { LocalAuthGuard } from 'src/domain/auth';
import { DeleteFile, GetFiles, GetFilesResponse, UploadFile, UploadFileResponse } from 'src/domain/files';
import { GetExtension, GetExtensionResponse } from '../../domain/extensions';
import { FileDto, FilesDto } from './dtos';
import { keepAlive } from './keep-alive';

@Controller('user-files')
@ApiTags('files')
@UseGuards(LocalAuthGuard)
export class UserFilesController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Get('')
  @ApiOperation({ operationId: 'getUserFiles', description: 'Gets the files for the user bucket.' })
  @ApiQuery({
    name: 'query',
    description: 'The query to search by file name.',
    required: false,
  })
  @ApiQuery({
    name: 'page',
    description: 'The page count.',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'pageSize',
    description: 'The page size.',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'conversationId',
    description: 'The conversation ID.',
    required: false,
    type: Number,
  })
  @ApiOkResponse({ type: FilesDto })
  async getUserFiles(
    @Req() req: Request,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
    @Query('query') query?: string,
    @Query('conversationId') conversationId?: number,
  ) {
    const result: GetFilesResponse = await this.queryBus.execute(
      new GetFiles({
        user: req.user,
        bucketIdOrType: conversationId ? 'conversation' : 'user',
        page: page || 0,
        pageSize: pageSize || 20,
        query,
        conversationId,
      }),
    );

    return FilesDto.fromDomain(result.files, result.total);
  }

  @Post('')
  @ApiOperation({ operationId: 'postUserFile', description: 'Creates an file.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiQuery({
    name: 'extensionId',
    required: true,
    type: 'number',
  })
  @ApiQuery({
    name: 'conversationId',
    required: false,
    type: 'number',
  })
  @UseInterceptors(FileInterceptor('file'))
  @ApiOkResponse({ type: FileDto })
  async postUserFile(
    @Req() req: Request,
    @Res() res: Response,
    @UploadedFile() file: Express.Multer.File,
    @Query('extensionId', new ParseIntPipe()) extensionId: number,
    @Query('conversationId', new ParseIntPipe({ optional: true })) conversationId?: number,
  ) {
    const result: GetExtensionResponse = await this.queryBus.execute(new GetExtension({ id: extensionId }));
    if (!result.extension?.enabled) {
      throw new NotFoundException('Extension not found');
    }

    const bucket = result.extension?.values?.bucket as number;
    const createEmbeddings = (bucket ? (result.extension?.fixedValues?.createEmbeddings ?? true) : false) as boolean;

    const command = new UploadFile({
      user: req.user,
      buffer: file.buffer,
      mimeType: file.mimetype,
      fileName: file.originalname,
      fileSize: file.size,
      bucketId: bucket,
      extensionId,
      createEmbeddings,
      conversationId,
    });

    await keepAlive(res, async () => {
      const result: UploadFileResponse = await this.commandBus.execute(command);
      return FileDto.fromDomain(result.file);
    });
  }

  @Delete(':fileId')
  @ApiOperation({ operationId: 'deleteUserFile', description: 'Deletes a file.' })
  @ApiParam({
    name: 'fileId',
    description: 'The ID of the file.',
    required: true,
    type: Number,
  })
  @ApiNoContentResponse()
  async deleteUserFile(@Req() req: Request, @Param('fileId') fileId: number) {
    const command = new DeleteFile(req.user, +fileId);

    await this.commandBus.execute(command);
  }
}
