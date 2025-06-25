import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from 'src/domain/users';
import { ConversationEntity, ConversationRepository } from '../../database';
import { DeleteConversationsHandler } from './delete-conversations';

describe('DeleteConversationsHandler', () => {
  let handler: DeleteConversationsHandler;
  let repository: Pick<ConversationRepository, 'delete'>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteConversationsHandler,
        {
          provide: getRepositoryToken(ConversationEntity),
          useValue: {
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get(DeleteConversationsHandler);
    repository = module.get(getRepositoryToken(ConversationEntity));
  });

  it('should delete conversations by userId', async () => {
    const userId = '1';
    jest.spyOn(repository, 'delete').mockResolvedValue({ affected: 1, raw: '' });

    await handler.execute({ user: { id: userId } as User });
    expect(repository.delete).toHaveBeenCalledWith({ userId });
  });

  it('should not delete conversations without userId', async () => {
    jest.spyOn(repository, 'delete').mockResolvedValue({ affected: 1, raw: '' });

    await handler.execute({ user: {} as User });
    expect(repository.delete).not.toHaveBeenCalled();
  });
});
