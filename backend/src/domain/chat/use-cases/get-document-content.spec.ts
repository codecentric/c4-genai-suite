import { NotFoundException } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Source } from 'src/domain/chat';
import { User } from 'src/domain/users';
import { MessageEntity, MessageRepository } from '../../database';
import { GetDocumentContent, GetDocumentContentHandler, GetDocumentContentResponse } from './get-document-content';

describe('Get Document Content', () => {
  let messageRepository: MessageRepository;
  let handler: GetDocumentContentHandler;

  const mockUser: User = {
    id: '1',
    name: 'Test User',
    email: 'test@example.com',
    userGroupIds: ['group1'],
  };

  beforeAll(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetDocumentContentHandler,
        {
          provide: getRepositoryToken(MessageEntity),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: QueryBus,
          useValue: {} as QueryBus,
        },
      ],
    }).compile();

    handler = module.get(GetDocumentContentHandler);
    messageRepository = module.get<MessageRepository>(getRepositoryToken(MessageEntity));
  });

  it('should return document content for valid user, message and document', async () => {
    const conversationId = 1;
    const messageId = 1;
    const documentUri = 's5q://foo.bar';
    const mockMessage = {
      id: messageId,
      sources: [
        { document: { uri: documentUri }, chunk: { content: 'chunk1' } },
        { document: { uri: documentUri }, chunk: { content: 'chunk2' } },
      ] as Source[],
      conversation: {
        userId: mockUser.id,
      },
    } as MessageEntity;

    jest.spyOn(messageRepository, 'findOne').mockResolvedValueOnce(mockMessage);

    const command = new GetDocumentContent(mockUser, conversationId, messageId, documentUri);
    const result = await handler.execute(command);
    expect(result).toEqual(new GetDocumentContentResponse(['chunk1', 'chunk2']));
  });

  it('should throw not found exception if message not found', async () => {
    const conversationId = 1;
    const messageId = 1;
    const documentUri = 's5q://foo.bar';
    jest.spyOn(messageRepository, 'findOne').mockResolvedValueOnce(null);
    const command = new GetDocumentContent(mockUser, conversationId, messageId, documentUri);
    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });

  it('should throw not found exception if user is not allowed', async () => {
    const conversationId = 1;
    const messageId = 1;
    const documentUri = 's5q://foo.bar';
    const mockMessage = {
      id: messageId,
      sources: [
        { document: { uri: documentUri }, chunk: { content: 'chunk1' } },
        { document: { uri: documentUri }, chunk: { content: 'chunk2' } },
      ] as Source[],
    } as MessageEntity;

    jest.spyOn(messageRepository, 'findOne').mockResolvedValueOnce(mockMessage);

    const command = new GetDocumentContent(mockUser, conversationId, messageId, documentUri);
    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });
});
