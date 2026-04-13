import { waitFor } from '@testing-library/react';
import { format } from 'date-fns';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AssistantsCountDto, AssistantsCountsDto, UsersCountDto, UsersCountsDto } from 'src/api';
import { mockedAPI } from 'src/mock/factory';
import { FilterInterval, useAssistantsCount, useUsersCount } from 'src/pages/admin/dashboard/hooks';
import { server } from '../../../../mock/node';
import { renderHook } from '../test-utils';

describe('Users Count Hook', () => {
  beforeAll(() => server.listen());
  beforeEach(() => {
    vi.resetAllMocks();
  });
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('should get users count for Dashboard', async () => {
    const firstDate = new Date('2024-10-24T14:07:32.450Z');
    const secondDate = new Date('2024-10-23T14:07:32.450Z');
    const usersCountToday: UsersCountDto = {
      date: firstDate,
      total: 42,
    };
    const usersCountYesterday: UsersCountDto = {
      date: secondDate,
      total: 69,
    };
    new mockedAPI()
      .withGet<UsersCountsDto>('/api/usages/users-count', {
        items: [usersCountToday, usersCountYesterday],
      })
      .run();

    const { result } = renderHook(() => useUsersCount(FilterInterval.Day));

    await waitFor(() =>
      expect(result.current).toEqual([
        {
          date: format(firstDate, 'yyyy-MM-dd'),
          total: 42,
        },
        {
          date: format(secondDate, 'yyyy-MM-dd'),
          total: 69,
        },
      ]),
    );
  });

  it('should get empty users count on error', async () => {
    new mockedAPI().withGetError('/api/usages/users-count').run();

    const { result } = renderHook(() => useUsersCount(FilterInterval.Day));

    await waitFor(() => expect(result.current).toEqual([]));
  });

  it('should get assistants count for Dashboard', async () => {
    const firstDate = new Date('2024-10-24T14:07:32.450Z');
    const secondDate = new Date('2024-10-23T14:07:32.450Z');
    const assistantsCountToday: AssistantsCountDto = {
      date: firstDate,
      total: 5,
      byAssistant: { Support: 3, Sales: 2 },
    };
    const assistantsCountYesterday: AssistantsCountDto = {
      date: secondDate,
      total: 4,
      byAssistant: { Support: 4 },
    };
    new mockedAPI()
      .withGet<AssistantsCountsDto>('/api/usages/assistants-count', {
        items: [assistantsCountToday, assistantsCountYesterday],
      })
      .run();

    const { result } = renderHook(() => useAssistantsCount(FilterInterval.Day));

    await waitFor(() =>
      expect(result.current).toEqual({
        items: [
          {
            date: format(firstDate, 'yyyy-MM-dd'),
            total: 5,
            byAssistant: { Support: 3, Sales: 2 },
            byAssistant_Support: 3,
            byAssistant_Sales: 2,
          },
          {
            date: format(secondDate, 'yyyy-MM-dd'),
            total: 4,
            byAssistant: { Support: 4 },
            byAssistant_Support: 4,
          },
        ],
        byAssistant: [
          { key: 'Support', color: '#003f5c', dataKey: 'byAssistant_Support' },
          { key: 'Sales', color: '#2f4b7c', dataKey: 'byAssistant_Sales' },
        ],
      }),
    );
  });
});
