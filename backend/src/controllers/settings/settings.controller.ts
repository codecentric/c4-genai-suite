import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  NotFoundException,
  Param,
  ParseEnumPipe,
  ParseFilePipe,
  Post,
  Req,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { LocalAuthGuard, Role, RoleGuard } from 'src/domain/auth';
import { BlobCategory, BUILTIN_USER_GROUP_ADMIN } from 'src/domain/database';
import {
  DeleteBlob,
  GetBlob,
  GetBlobResponse,
  GetSettings,
  GetSettingsResponse,
  UpdateSettings,
  UpdateSettingsResponse,
  UploadBlob,
} from 'src/domain/settings';
import { SettingsDto } from './dtos';

enum ImageTypeEnum {
  LOGO = 'logo',
  BACKGROUND_LOGO = 'backgroundLogo',
  AVATAR_LOGO = 'avatarLogo',
}

@Controller('settings')
@ApiTags('settings')
export class SettingsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get(':imageType')
  @ApiOperation({ operationId: 'getImage', description: 'Gets the logo.' })
  @ApiOkResponse({
    description: 'Stream a file',
    content: {
      'application/octet-stream': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async getImage(@Param('imageType', new ParseEnumPipe(ImageTypeEnum)) imageType: ImageTypeEnum) {
    const result: GetBlobResponse = await this.queryBus.execute(new GetBlob(`__${imageType}`));

    if (!result.blob) {
      throw new NotFoundException(`Cannot find ${imageType}.`);
    }

    return new StreamableFile(result.blob.buffer, { type: result.blob.type });
  }

  @Get('')
  @ApiOperation({ operationId: 'getSettings', description: 'Gets settings.' })
  @ApiOkResponse({ type: SettingsDto })
  async getSettings() {
    const result: GetSettingsResponse = await this.queryBus.execute(new GetSettings());

    return SettingsDto.fromDomain(result.settings);
  }

  @Post('')
  @ApiOperation({ operationId: 'postSettings', description: 'Update settings.' })
  @ApiOkResponse({ type: SettingsDto })
  @Role(BUILTIN_USER_GROUP_ADMIN)
  @UseGuards(LocalAuthGuard, RoleGuard)
  async postSettings(@Body() request: SettingsDto, @Req() req: Request) {
    const result: UpdateSettingsResponse = await this.commandBus.execute(new UpdateSettings(request, req.user));

    return SettingsDto.fromDomain(result.settings);
  }

  @Post(':imageType')
  @ApiOperation({ operationId: 'postImage' })
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
  @Role(BUILTIN_USER_GROUP_ADMIN)
  @UseGuards(LocalAuthGuard, RoleGuard)
  async postImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 2_000_000 }),
          new FileTypeValidator({
            fileType: /(image\/jpeg)|(image\/png)|(image\/webp)|(image\/svg\+xml)/,
            skipMagicNumbersValidation: true,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Param('imageType', new ParseEnumPipe(ImageTypeEnum)) imageType: ImageTypeEnum,
    @Req() req: Request,
  ) {
    await this.commandBus.execute(
      new UploadBlob(`__${imageType}`, file.buffer, file.mimetype, file.filename, file.size, BlobCategory.LOGO),
    );
    await this.commandBus.execute(new UpdateSettings({ [imageType]: `__${imageType}` }, req.user));
  }

  @Delete(':imageType')
  @ApiOperation({ operationId: 'deleteLogo', description: 'Deletes the logo.' })
  @ApiNoContentResponse()
  @Role(BUILTIN_USER_GROUP_ADMIN)
  @UseGuards(LocalAuthGuard, RoleGuard)
  async deleteLogo(@Param('imageType', new ParseEnumPipe(ImageTypeEnum)) imageType: ImageTypeEnum, @Req() req: Request) {
    await this.commandBus.execute(new DeleteBlob(`__${imageType}`));
    await this.commandBus.execute(new UpdateSettings({ [imageType]: null }, req.user));
  }
}
