import { forwardRef, Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryBus, QueryHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/domain/users';
import { ExtensionSource, MessageEntity, MessageRepository } from '../../database';
import { GetExtension, GetExtensionResponse } from '../../extensions';

export class GetDocumentContent {
  constructor(
    public readonly user: User,
    public readonly conversationId: number,
    public readonly messageId: number,
    public readonly documentUri: string,
  ) {}
}

export class GetDocumentContentResponse {
  constructor(public readonly documentContent: Array<string>) {}
}

@QueryHandler(GetDocumentContent)
export class GetDocumentContentHandler implements IQueryHandler<GetDocumentContent, GetDocumentContentResponse> {
  constructor(
    @InjectRepository(MessageEntity)
    private readonly messageRepository: MessageRepository,
    @Inject(forwardRef(() => QueryBus))
    private readonly queryBus: QueryBus,
  ) {}

  private async fetchContent(documentUri: string, sources: ExtensionSource[]): Promise<string[]> {
    if (sources.length === 0 || sources.every((source) => source.chunk.content)) {
      return sources.map((source) => source.chunk.content);
    }

    const chunkUris = sources.map((source) => source.chunk.uri).filter((source) => !!source) as string[];
    if (chunkUris.length === 0) {
      return [];
    }

    const response: GetExtensionResponse = await this.queryBus.execute(
      new GetExtension({ externalId: sources[0].extensionExternalId }),
    );

    return (await response.extension?.getChunks(documentUri, chunkUris)) ?? [];
  }

  async execute(query: GetDocumentContent): Promise<GetDocumentContentResponse> {
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
      throw new NotFoundException(`Cannot find a document with uri ${query.documentUri} for this user`);
    }

    return new GetDocumentContentResponse(await this.fetchContent(query.documentUri, references));
  }
}
