import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
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
import { LocalAuthGuard, Role, RoleGuard } from 'src/domain/auth';
import { BUILTIN_USER_GROUP_ADMIN } from 'src/domain/database';
import {
  CreateBucket,
  CreateBucketResponse,
  DeleteBucket,
  DeleteFile,
  GetBucket,
  GetBucketResponse,
  GetBuckets,
  GetBucketsResponse,
  GetFiles,
  GetFilesResponse,
  TestBucket,
  UpdateBucket,
  UpdateBucketResponse,
  UploadFile,
  UploadFileResponse,
} from 'src/domain/files';
import { GetFileTypes, GetFileTypesResponse } from '../../domain/files/use-cases/get-file-types';
import { BucketDto, BucketsDto, FileDto, FilesDto, FileTypesDto, TestBucketDto, UpsertBucketDto } from './dtos';
import { keepAlive } from './keep-alive';

@Controller('buckets')
@ApiTags('files')
@UseGuards(LocalAuthGuard)
export class FilesController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Post('test')
  @ApiOperation({ operationId: 'testBucket', description: 'Tests the bucket.' })
  @ApiNoContentResponse()
  @Role(BUILTIN_USER_GROUP_ADMIN)
  @UseGuards(RoleGuard)
  async testBucket(@Body() body: TestBucketDto) {
    const command = new TestBucket(body.endpoint, body.headers);

    await this.commandBus.execute(command);
  }

  @Get('/fileTypes')
  @ApiQuery({
    name: 'endpoint',
    description: 'The rag endpoint.',
    required: true,
    type: String,
  })
  @ApiQuery({
    name: 'headers',
    description: 'The rag headers.',
    required: false,
    type: String,
  })
  @ApiOperation({ operationId: 'getFileTypes', description: 'Gets the file types.' })
  @ApiOkResponse({ type: FileTypesDto })
  async getFileTypes(@Query('endpoint') endpoint: string, @Query('headers') headers?: string) {
    const result: GetFileTypesResponse = await this.queryBus.execute(new GetFileTypes(endpoint, headers));
    return FileTypesDto.fromDomain(result.fileTypes);
  }

  @Get('')
  @ApiOperation({ operationId: 'getBuckets', description: 'Gets the buckets.' })
  @ApiOkResponse({ type: BucketsDto })
  async getBuckets() {
    const result: GetBucketsResponse = await this.queryBus.execute(new GetBuckets());

    return BucketsDto.fromDomain(result.buckets);
  }

  @Get(':id')
  @ApiOperation({ operationId: 'getBucket', description: 'Gets the bucket with the given id.' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the bucket.',
    required: true,
    type: Number,
  })
  @ApiOkResponse({ type: BucketDto })
  async getBucket(@Param('id', ParseIntPipe) bucketId: number) {
    const result: GetBucketResponse = await this.queryBus.execute(new GetBucket(bucketId));

    return BucketDto.fromDomain(result.bucket);
  }

  @Post('')
  @ApiOperation({ operationId: 'postBucket' })
  @ApiOkResponse({ description: 'Creates a bucket.', type: BucketDto })
  @Role(BUILTIN_USER_GROUP_ADMIN)
  @UseGuards(RoleGuard)
  async postBucket(@Body() body: UpsertBucketDto, @Req() req: Request) {
    const command = new CreateBucket(body, req.user);

    const result: CreateBucketResponse = await this.commandBus.execute(command);

    return BucketDto.fromDomain(result.bucket);
  }

  @Put(':id')
  @ApiOperation({ operationId: 'putBucket', description: 'Updates a bucket.' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the bucket.',
    required: true,
    type: Number,
  })
  @ApiOkResponse({ type: BucketDto })
  @Role(BUILTIN_USER_GROUP_ADMIN)
  @UseGuards(RoleGuard)
  async putBucket(@Param('id') id: number, @Body() body: UpsertBucketDto, @Req() req: Request) {
    const command = new UpdateBucket(id, body, req.user);

    const result: UpdateBucketResponse = await this.commandBus.execute(command);

    return BucketDto.fromDomain(result.bucket);
  }

  @Delete(':id')
  @ApiOperation({ operationId: 'deleteBucket', description: 'Deletes an bucket.' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the bucket.',
    required: true,
    type: Number,
  })
  @ApiNoContentResponse()
  @Role(BUILTIN_USER_GROUP_ADMIN)
  @UseGuards(RoleGuard)
  async deleteBucket(@Param('id') id: number, @Req() req: Request) {
    const command = new DeleteBucket(id, req.user);
    await this.commandBus.execute(command);
  }

  @Get(':id/files')
  @ApiOperation({ operationId: 'getFiles', description: 'Gets the files for the bucket.' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the configuration.',
    required: true,
    type: Number,
  })
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
  @ApiOkResponse({ type: FilesDto })
  async getFiles(
    @Param('id') id: number,
    @Req() req: Request,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
    @Query('query') query?: string,
  ) {
    const result: GetFilesResponse = await this.queryBus.execute(
      new GetFiles({ user: req.user, bucketIdOrType: +id, page: page || 0, pageSize: pageSize, query }),
    );
    return FilesDto.fromDomain(result.files, result.total);
  }

  @Post(':id/files')
  @ApiOperation({ operationId: 'postFile', description: 'Creates a file.' })
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
  @UseInterceptors(FileInterceptor('file'))
  @ApiOkResponse({ type: FileDto })
  @Role(BUILTIN_USER_GROUP_ADMIN)
  @UseGuards(RoleGuard)
  async postFile(@Param('id') bucketId: number, @Res() res: Response, @UploadedFile() file: Express.Multer.File) {
    const command = new UploadFile({
      buffer: file.buffer,
      mimeType: file.mimetype,
      fileName: file.originalname,
      fileSize: file.size,
      bucketId: bucketId,
      embedType: 'vector',
    });

    await keepAlive(res, async () => {
      const result: UploadFileResponse = await this.commandBus.execute(command);
      return FileDto.fromDomain(result.file);
    });
  }

  @Put(':id/files/:fileId')
  @ApiOperation({ operationId: 'putFile', description: 'Updates a file.' })
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
  @UseInterceptors(FileInterceptor('file'))
  @ApiOkResponse({ type: FileDto })
  @Role(BUILTIN_USER_GROUP_ADMIN)
  @UseGuards(RoleGuard)
  async putFile(
    @Param('id') bucketId: number,
    @Param('fileId', ParseIntPipe) fileId: number,
    @Res() res: Response,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const command = new UploadFile({
      fileIdToUpdate: fileId,
      buffer: file.buffer,
      mimeType: file.mimetype,
      fileName: file.originalname,
      fileSize: file.size,
      bucketId: bucketId,
      embedType: 'vector',
    });

    await keepAlive(res, async () => {
      const result: UploadFileResponse = await this.commandBus.execute(command);
      return FileDto.fromDomain(result.file);
    });
  }

  @Delete(':id/files/:fileId')
  @ApiOperation({ operationId: 'deleteFile', description: 'Deletes a file.' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the bucket.',
    required: true,
    type: Number,
  })
  @ApiParam({
    name: 'fileId',
    description: 'The ID of the file.',
    required: true,
    type: Number,
  })
  @ApiNoContentResponse()
  @Role(BUILTIN_USER_GROUP_ADMIN)
  @UseGuards(RoleGuard)
  async deleteFile(@Param('id') id: number, @Param('fileId') fileId: number) {
    const command = new DeleteFile(+id, +fileId);

    await this.commandBus.execute(command);
  }
}
