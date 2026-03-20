import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { startOfDay, startOfMonth, startOfWeek, subDays, subMonths, subWeeks } from 'date-fns';
import { AssistantsCount, MessageEntity, MessageRepository } from '../../database';
import { GroupBy } from '../statistics';
import { GetAssistantsCount, GetAssistantsCountHandler } from './get-assistants-count';

describe('Get Assistants Count', () => {
  jest.useFakeTimers();
  let messageRepository: MessageRepository;
  let handler: GetAssistantsCountHandler;
  const repositoryToken = getRepositoryToken(MessageEntity);

  beforeAll(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAssistantsCountHandler,
        {
          provide: repositoryToken,
          useClass: MessageRepository,
        },
      ],
    }).compile();
    messageRepository = module.get<MessageRepository>(repositoryToken);
    handler = module.get(GetAssistantsCountHandler);
  });

  it('should be defined', () => {
    expect(GetAssistantsCount).toBeDefined();
  });

  it('should return entries with assistant totals and labels', async () => {
    const date = startOfDay(new Date());
    const payload: AssistantsCount[] = [
      { date: subDays(date, 1), total: 10, byAssistant: { Support: 6, Sales: 4 } },
      { date, total: 12, byAssistant: { Support: 5, Sales: 7 } },
    ];
    jest.spyOn(messageRepository, 'getAssistantsCount').mockResolvedValueOnce(payload);

    const result = await handler.execute(new GetAssistantsCount(undefined, GroupBy.Day));

    expect(result.result).toHaveLength(2);
    expect(result.result[1]).toMatchObject({ date: expect.any(Date) as Date, total: 12, byAssistant: { Support: 5, Sales: 7 } });
  });

  it('should return assistants count grouped by week', async () => {
    const currentWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
    const lastWeek = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });
    const payload: AssistantsCount[] = [
      { date: lastWeek, total: 8, byAssistant: { Support: 8 } },
      { date: currentWeek, total: 3, byAssistant: { Sales: 3 } },
    ];
    jest.spyOn(messageRepository, 'getAssistantsCount').mockResolvedValue(payload);

    const result = await handler.execute(new GetAssistantsCount(lastWeek, GroupBy.Week));

    expect(result.result).toHaveLength(2);
    expect(result.result[0]).toMatchObject({ date: expect.any(Date) as Date, total: 8 });
    expect(result.result[1]).toMatchObject({ date: expect.any(Date) as Date, total: 3 });
  });

  it('should return assistants count grouped by month', async () => {
    const currentMonth = startOfMonth(new Date());
    const lastMonth = startOfMonth(subMonths(new Date(), 1));
    const payload: AssistantsCount[] = [
      { date: lastMonth, total: 2, byAssistant: { Support: 2 } },
      { date: currentMonth, total: 9, byAssistant: { Sales: 9 } },
    ];
    jest.spyOn(messageRepository, 'getAssistantsCount').mockResolvedValue(payload);

    const result = await handler.execute(new GetAssistantsCount(lastMonth, GroupBy.Month));

    expect(result.result).toHaveLength(2);
    expect(result.result[0]).toMatchObject({ date: expect.any(Date) as Date, total: 2 });
    expect(result.result[1]).toMatchObject({ date: expect.any(Date) as Date, total: 9 });
  });
});
