import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Like } from 'typeorm';
import * as uuid from 'uuid';
import {
  BlobEntity,
  ConversationEntity,
  ConversationRepository,
  FileEntity,
  FileRepository,
  MessageEntity,
  MessageRepository,
} from '../../database';
import { Conversation } from '../interfaces';

export class DuplicateConversationResponse {
  constructor(public readonly conversation: Conversation) {}
}

export class DuplicateConversation {
  constructor(public readonly id: number) {}
}

@CommandHandler(DuplicateConversation)
export class DuplicateConversationHandler implements ICommandHandler<DuplicateConversation, DuplicateConversationResponse> {
  constructor(
    @InjectRepository(ConversationEntity)
    private readonly conversationRepository: ConversationRepository,
    @InjectRepository(FileEntity)
    private readonly fileRepository: FileRepository,
    @InjectRepository(MessageEntity)
    private readonly messageRepository: MessageRepository,
  ) {}

  async execute(command: DuplicateConversation): Promise<DuplicateConversationResponse> {
    const { id } = command;

    const conversationEntity = await this.conversationRepository.findOne({
      where: { id },
      relations: { messages: true, files: { blobs: true } },
    });

    if (!conversationEntity) {
      throw new NotFoundException(`Conversation with id ${id} not found`);
    }

    const sortedMessages = [...conversationEntity.messages].sort((a, b) => a.id - b.id);
    const sortedFiles = conversationEntity.files?.sort((a, b) => a.id - b.id) ?? [];

    const newFiles = await Promise.all(
      (sortedFiles || []).map(async (file) => {
        const newFile = this.fileRepository.create({
          ...file,
          id: undefined,
          blobs: file.blobs.map((blob: BlobEntity) => ({ ...blob, id: uuid.v4() })),
          externalDocumentId: file.externalDocumentId,
        });

        return this.fileRepository.save(newFile);
      }),
    );

    // It is kind of expensive to get all conversations, which have conflicting names
    // but since duplication is a rare event, this should be fine
    // (since we are looking for a fixed prefix, an index over the conversation names might be sensible
    // if this turns out to be a performance problem).
    // Also escape sequences with special meaning for `like` (other sql injection will be escaped by typeORM)
    const escapedBasename = conversationEntity.name.replace(/\s*\((\d+)\)$/, '').replace(/[\\%_]/g, '\\$&');
    const conflictingEntities = await this.conversationRepository.find({
      where: { name: Like(`${escapedBasename} (%)`) },
      select: ['name'],
    });
    const conflictingNames = conflictingEntities.map((entity) => entity.name);

    const newConversation = this.conversationRepository.create({
      ...conversationEntity,
      id: undefined,
      name: generateNameForDuplicate(conversationEntity.name, conflictingNames),
      isNameSetManually: true,
      files: newFiles,
      messages: [],
    });

    const saved = await this.conversationRepository.save(newConversation);

    const messageIdMap = new Map<number, number>();
    for (const { id, parentId, ...message } of sortedMessages) {
      const newMessage = await this.messageRepository.save({
        ...message,
        parentId: messageIdMap.get(parentId ?? 0),
        conversationId: saved.id,
      });
      messageIdMap.set(id, newMessage.id);
    }

    return new DuplicateConversationResponse(saved);
  }
}

export function generateNameForDuplicate(name: string, conflictingTitles: string[]): string {
  const baseName = name.replace(/\s*\((\d+)\)$/, '');
  for (let i = 2; ; i++) {
    const newName = `${baseName} (${i})`;
    if (!conflictingTitles.includes(newName)) {
      return newName;
    }
  }
}
