import { forwardRef, Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/domain/users';
import { ExtensionSource, MessageEntity, MessageRepository } from '../../database';
import { GetExtension, GetExtensionResponse } from '../../extensions';

export class GetDocument {
  constructor(
    public readonly user: User,
    public readonly conversationId: number,
    public readonly messageId: number,
    public readonly documentUri: string,
  ) {}
}

export class GetDocumentResponse {
  constructor(public readonly document?: File) {}
}

@QueryHandler(GetDocument)
export class GetDocumentHandler implements IQueryHandler<GetDocument, GetDocumentResponse> {
  constructor(
    @InjectRepository(MessageEntity)
    private readonly messageRepository: MessageRepository,
    @Inject(forwardRef(() => QueryBus))
    private readonly queryBus: QueryBus,
  ) {}

  private async fetchDocument(documentUri: string, source: ExtensionSource): Promise<File | undefined> {
    const response: GetExtensionResponse = await this.queryBus.execute(
      new GetExtension({ externalId: source.extensionExternalId }),
    );

    return await response.extension?.getDocument(documentUri);
  }

  async execute(query: GetDocument): Promise<GetDocumentResponse> {
    const message = await this.messageRepository.findOne({
      where: { id: query.messageId },
      relations: {
        conversation: true,
      },
    });
    if (!message || message.conversation?.userId !== query.user.id) {
      throw new NotFoundException(`Cannot find a message with id ${query.messageId} for this user`);
    }

    const references = message.sources?.filter((x) => x.document?.uri === query.documentUri);
    if (!references?.length) {
      throw new NotFoundException(`Cannot find a document with uri ${query.documentUri}`);
    }

    return new GetDocumentResponse(await this.fetchDocument(query.documentUri, references[0]));
  }
}
