import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiExtraModels,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiTags,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { LocalAuthGuard } from 'src/domain/auth';
import {
  CallbackService,
  DeleteConversation,
  DeleteConversations,
  DuplicateConversation,
  DuplicateConversationResponse,
  GetConversation,
  GetConversationResponse,
  GetConversations,
  GetConversationsResponse,
  GetDocumentContent,
  GetDocumentContentResponse,
  GetHistory,
  GetHistoryResponse,
  RateMessage,
  SendMessage,
  SendMessageResponse,
  StartConversation,
  StartConversationResponse,
  StreamEvent,
  UpdateConversation,
  UpdateConversationResponse,
} from 'src/domain/chat';
import { GetDocument, GetDocumentResponse } from 'src/domain/chat/use-cases/get-document';
import {
  ChatUICallbackResultDto,
  ConversationDto,
  ConversationsDto,
  CreateConversationDto,
  MessagesDto,
  RateMessageDto,
  SendMessageDto,
  StreamEventHolderDto,
  UpdateConversationDto,
} from './dtos';

@Controller('conversations')
@ApiTags('conversation')
@UseGuards(LocalAuthGuard)
export class ConversationsController {
  private logger = new Logger(this.constructor.name);

  constructor(
    private readonly callbacks: CallbackService,
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get('')
  @ApiOperation({ operationId: 'getConversations', description: 'Gets the list of recent conversations' })
  @ApiOkResponse({ type: ConversationsDto })
  @ApiExtraModels(StreamEventHolderDto)
  async getConversations(@Req() req: Request) {
    const response: GetConversationsResponse = await this.queryBus.execute(new GetConversations(req.user));

    return ConversationsDto.fromDomain(response.conversations);
  }

  @Get(':id')
  @ApiOperation({ operationId: 'getConversation', description: 'Get the conversation by ID.' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the conversation.',
    required: true,
    type: Number,
  })
  @ApiOkResponse({ type: ConversationDto })
  async getConversation(@Req() req: Request, @Param('id') id: number) {
    const result: GetConversationResponse = await this.queryBus.execute(new GetConversation(+id, req.user));
    if (!result.conversation) {
      throw new NotFoundException(`Conversation with id '${id}' was not found`);
    }

    return ConversationDto.fromDomain(result.conversation);
  }

  @Post('')
  @ApiOperation({ operationId: 'postConversation', description: 'Starts the conversation.' })
  @ApiOkResponse({ type: ConversationDto })
  async postConversation(@Req() req: Request, @Body() body: CreateConversationDto) {
    const result: StartConversationResponse = await this.commandBus.execute(new StartConversation(req.user, body));

    return ConversationDto.fromDomain(result.conversation);
  }

  @Post(':id/duplicate')
  @ApiOperation({ operationId: 'duplicateConversation', description: 'Duplicates the conversation.' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the conversation.',
    required: true,
    type: Number,
  })
  @ApiOkResponse({ type: ConversationDto })
  async duplicateConversation(@Param('id') id: number) {
    const result: DuplicateConversationResponse = await this.commandBus.execute(new DuplicateConversation(id));
    return ConversationDto.fromDomain(result.conversation);
  }

  @Patch(':id')
  @ApiOperation({ operationId: 'patchConversation', description: 'Update the conversation.' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the conversation.',
    required: true,
    type: Number,
  })
  @ApiOkResponse({ type: ConversationDto })
  async patchConversation(@Req() req: Request, @Param('id') id: number, @Body() body: UpdateConversationDto) {
    const result: UpdateConversationResponse = await this.commandBus.execute(new UpdateConversation(+id, req.user, body));

    return ConversationDto.fromDomain(result.conversation);
  }

  @Get(':id/messages')
  @ApiOperation({ operationId: 'getMessages', description: 'Gets the messages of the current conversation.' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the conversation.',
    required: true,
    type: Number,
  })
  @ApiOkResponse({ type: MessagesDto })
  async getMessages(@Req() req: Request, @Param('id') id: number) {
    const result: GetHistoryResponse = await this.queryBus.execute(new GetHistory(+id, req.user));

    return MessagesDto.fromDomain(result.history);
  }

  @Get(':id/messages/:messageId/documents/:documentUri/chunks')
  @ApiOperation({ operationId: 'getDocumentChunks', description: 'Get an array of document contents.' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the conversation.',
    required: true,
    type: Number,
  })
  @ApiParam({
    name: 'messageId',
    description: 'The ID of the ai message',
    required: true,
    type: Number,
  })
  @ApiParam({
    name: 'documentUri',
    description: 'The uri of the document',
    required: true,
    type: String,
  })
  @ApiOkResponse({ type: [String] })
  async getDocumentChunks(
    @Req() req: Request,
    @Param('id', ParseIntPipe) conversationId: number,
    @Param('messageId', ParseIntPipe) messageId: number,
    @Param('documentUri') documentUri: string,
  ) {
    const result: GetDocumentContentResponse = await this.queryBus.execute(
      new GetDocumentContent(req.user, conversationId, messageId, documentUri),
    );
    return result.documentContent;
  }

  @Get(':id/messages/:messageId/documents/:documentUri')
  @ApiOperation({
    operationId: 'getDocument',
    description: 'Get the original document specified by the documentUri from an extension',
  })
  @ApiParam({
    name: 'id',
    description: 'The ID of the conversation.',
    required: true,
    type: Number,
  })
  @ApiParam({
    name: 'messageId',
    description: 'The ID of the ai message.',
    required: true,
    type: Number,
  })
  @ApiParam({
    name: 'documentUri',
    description: 'The URI identifying the document.',
    required: true,
    type: String,
  })
  @ApiOkResponse({
    schema: {
      type: 'string',
      format: 'binary',
    },
  })
  @ApiProduces('application/octet-stream')
  async getDocument(
    @Req() req: Request,
    @Res() response: Response,
    @Param('id', ParseIntPipe) conversationId: number,
    @Param('messageId', ParseIntPipe) messageId: number,
    @Param('documentUri') documentUri: string,
  ) {
    const result: GetDocumentResponse = await this.queryBus.execute(
      new GetDocument(req.user, conversationId, messageId, documentUri),
    );

    const document = result.document;
    if (!document) {
      response.status(404).send('Document not found');
      return;
    }
    const contentType = document.type ?? 'application/octet-stream';
    const bytes = await document.bytes();

    response.setHeader('Content-Type', contentType);
    response.setHeader('Content-Disposition', `attachment; filename="${document.name ?? 'document'}"`);

    response.send(bytes);
  }

  private async streamResponse(
    @Req() req: Request,
    @Res() response: Response,
    getStream: () => Promise<Observable<StreamEvent>>,
  ) {
    response.set({
      'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0, no-transform',
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream',
    });

    response.flushHeaders();

    let messageId = 1;

    const sendEvent = (type: 'error' | 'message', data: string | object) => {
      response.write(`id: ${messageId++}\n`);
      response.write(`event: ${type}\n`);
      response.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const stream = await getStream();
      const subscription = stream.subscribe({
        next: (event) => sendEvent('message', event),
        error: (err: Error) => sendEvent('error', err),
        complete: () => response.end(),
      });

      req.on('close', () => {
        subscription.unsubscribe();
        response.end();
      });
    } catch (err) {
      this.logger.error('Error during message processing', err);
      sendEvent('error', err as Error);
      response.end();
    }
  }

  @Put(':id/messages/:messageId/sse')
  @ApiOperation({
    operationId: 'putMessage',
    description: 'Updates an existing message message of the converation and handles it.',
  })
  @ApiParam({
    name: 'id',
    description: 'The ID of the conversation.',
    required: true,
    type: Number,
  })
  @ApiParam({
    name: 'messageId',
    description: 'The ID of the message.',
    required: true,
    type: Number,
  })
  async putMessage(
    @Req() req: Request,
    @Res() response: Response,
    @Param('id', ParseIntPipe) id: number,
    @Param('messageId', ParseIntPipe) messageId: number,
    @Body() dto: SendMessageDto,
  ) {
    return this.streamResponse(req, response, async () => {
      const { stream }: SendMessageResponse = await this.queryBus.execute(
        new SendMessage(id, req.user, dto.query, dto.files, messageId),
      );
      return stream;
    });
  }

  @Post(':id/messages/sse')
  @ApiParam({
    name: 'id',
    description: 'The ID of the conversation.',
    required: true,
    type: Number,
  })
  @ApiOperation({ operationId: 'postMessage', description: 'Adds a message to the converation and handles it.' })
  async postMessage(
    @Req() req: Request,
    @Res() response: Response,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SendMessageDto,
  ) {
    return this.streamResponse(req, response, async () => {
      const { stream }: SendMessageResponse = await this.queryBus.execute(new SendMessage(id, req.user, dto.query, dto.files));
      return stream;
    });
  }

  @Patch(':id/messages/:messageId')
  @ApiOperation({ operationId: 'rateMessage', description: 'Updates the rating of a message of the conversation.' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the conversation.',
    required: true,
    type: Number,
  })
  @ApiParam({
    name: 'messageId',
    description: 'The ID of the message.',
    required: true,
    type: Number,
  })
  @ApiNoContentResponse()
  async rateMessage(
    @Req() req: Request,
    @Param('id') id: number,
    @Param('messageId') messageId: number,
    @Body() request: RateMessageDto,
  ) {
    await this.commandBus.execute(new RateMessage(+id, +messageId, req.user, request.rating));
  }

  @Delete()
  @ApiOperation({ operationId: 'deleteConversations', description: 'Deletes all conversations of a user.' })
  @ApiNoContentResponse()
  async deleteConversations(@Req() req: Request) {
    await this.commandBus.execute(new DeleteConversations(req.user));
  }

  @Delete(':id')
  @ApiOperation({ operationId: 'deleteConversation', description: 'Deletes the conversation.' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the conversation.',
    required: true,
    type: Number,
  })
  @ApiNoContentResponse()
  async deleteConversation(@Req() req: Request, @Param('id') id: number) {
    await this.commandBus.execute(new DeleteConversation(+id, req.user));
  }

  @Delete('confirm/:id')
  @ApiOperation({ operationId: 'confirm' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the confirmation request.',
    required: true,
    type: String,
  })
  @ApiNoContentResponse()
  confirm(@Param('id') id: string, @Body() result: ChatUICallbackResultDto) {
    this.callbacks.complete(id, result);
  }
}
