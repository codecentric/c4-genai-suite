import { useQuery } from '@tanstack/react-query';
import { format, startOfDay, startOfMonth, startOfWeek, subDays, subMonths, subWeeks } from 'date-fns';
import { useMemo } from 'react';
import { MessagesCountsDto, useApi, UsersCountsDto } from 'src/api';

export enum FilterInterval {
  Day = 'day',
  Week = 'week',
  Month = 'month',
  Total = 'total',
}

const numberOfDaysForDayFilter = 30;
const numberOfWeeksForWeekFilter = 10;
const numberOfMonthsForMonthFilter = 12;

const mapFilterIntervalToStartDate = (interval: FilterInterval) => {
  switch (interval) {
    case FilterInterval.Day:
      return startOfDay(subDays(new Date(), numberOfDaysForDayFilter));
    case FilterInterval.Week:
      return startOfWeek(subWeeks(new Date(), numberOfWeeksForWeekFilter), { weekStartsOn: 1 });
    case FilterInterval.Month:
      return startOfMonth(subMonths(new Date(), numberOfMonthsForMonthFilter));
    case FilterInterval.Total:
      return undefined;
  }
};

const mapFilterIntervalToGroupBy = (interval: FilterInterval) => {
  if (interval === FilterInterval.Total) {
    return FilterInterval.Day;
  }
  return interval;
};

type UsageResultItem = {
  date: string;
  total: number;
  byModel: {
    [key: string]: number;
  };
} & {
  [key: `byModel_${string}`]: number;
};

export function useUsage(filterInterval: FilterInterval) {
  const api = useApi();
  const since = mapFilterIntervalToStartDate(filterInterval);
  const { data: loadedUsage } = useQuery({
    queryKey: ['usage', filterInterval],
    queryFn: () => api.usages.getTokenUsage(since, mapFilterIntervalToGroupBy(filterInterval)),
  });

  const items = useMemo(() => {
    const result: UsageResultItem[] = [];

    for (const item of loadedUsage?.items || []) {
      const clone: UsageResultItem = {
        date: format(item.date, 'yyyy-MM-dd'),
        total: item.total,
        byModel: item.byModel,
      };

      for (const [key, value] of Object.entries(item.byModel)) {
        clone[`byModel_${key}`] = value;
      }

      result.push(clone);
    }

    return result;
  }, [loadedUsage?.items]);

  const byModel = useBars(items, 'byModel', 'byModel_');

  return { byModel, items, totalKey: 'total', loadedUsage };
}

type RatingsResultItem = {
  date: string;
  total: number;
  byCategory: {
    [key: string]: number;
  };
} & {
  [key: `byCategory_${string}`]: number;
};

export function useRatings(filterInterval: FilterInterval) {
  const api = useApi();
  const since = mapFilterIntervalToStartDate(filterInterval);

  const { data } = useQuery({
    queryKey: ['ratings', filterInterval],
    queryFn: () => api.usages.getRatings(since, mapFilterIntervalToGroupBy(filterInterval)),
  });

  const items = useMemo(() => {
    const result: RatingsResultItem[] = [];

    for (const item of data?.items || []) {
      const clone: RatingsResultItem = {
        date: format(item.date, 'yyyy-MM-dd'),
        total: item.total,
        byCategory: item.byCategory,
      };

      for (const [key, value] of Object.entries(item.byCategory)) {
        clone[`byCategory_${key}`] = value;
      }

      result.push(clone);
    }

    return result;
  }, [data?.items]);

  const byCategory = useBars(items, 'byCategory', 'byCategory_');

  return { byCategory, items, totalKey: 'total' };
}

type AssistantsResultItem = {
  date: string;
  total: number;
  byAssistant: {
    [key: string]: number;
  };
} & {
  [key: `byAssistant_${string}`]: number;
};

export function useAssistantsCount(filterInterval: FilterInterval) {
  const api = useApi();
  const since = mapFilterIntervalToStartDate(filterInterval);

  const { data } = useQuery({
    queryKey: ['assistantsCount', filterInterval],
    queryFn: () => api.usages.getAssistantsCount(since, mapFilterIntervalToGroupBy(filterInterval)),
  });

  const items = useMemo(() => {
    const result: AssistantsResultItem[] = [];

    for (const item of data?.items || []) {
      const clone: AssistantsResultItem = {
        date: format(item.date, 'yyyy-MM-dd'),
        total: item.total,
        byAssistant: item.byAssistant,
      };

      for (const [assistantId, value] of Object.entries(item.byAssistant)) {
        clone[`byAssistant_${assistantId}`] = value;
      }

      result.push(clone);
    }

    return result;
  }, [data?.items]);

  const byAssistant = useBars(items, 'byAssistant', 'byAssistant_');

  return { byAssistant, items };
}

export function useMessagesCount(filterInterval: FilterInterval) {
  const since = mapFilterIntervalToStartDate(filterInterval);
  const api = useApi();
  const { data } = useQuery({
    queryKey: ['messagesCount', filterInterval],
    queryFn: () => api.usages.getMessagesCount(since, mapFilterIntervalToGroupBy(filterInterval)),
  });

  return useMemo(() => {
    return formatCounts(data);
  }, [data]);
}

export function useUsersCount(filterInterval: FilterInterval) {
  const api = useApi();
  const since = mapFilterIntervalToStartDate(filterInterval);
  const { data } = useQuery({
    queryKey: ['usersCount', filterInterval],
    queryFn: () => api.usages.getUsersCount(since, mapFilterIntervalToGroupBy(filterInterval)),
  });

  return useMemo(() => {
    return formatCounts(data);
  }, [data]);
}

function useBars<T extends UsageResultItem | RatingsResultItem | AssistantsResultItem>(
  items: T[],
  property: keyof T,
  path: string,
) {
  const bars = useMemo(() => {
    const uniqueKeys = new Set(items.flatMap((item) => Object.keys(item[property] as object)));

    return [...uniqueKeys.values()].map((key, i) => ({ key, color: getColor(i), dataKey: `${path}${key}` }));
  }, [items, path, property]);

  return bars;
}

function getColor(i: number) {
  return COLOR_PALETTE[i % COLOR_PALETTE.length];
}

const COLOR_PALETTE = ['#003f5c', '#2f4b7c', '#665191', '#a05195', '#d45087', '#f95d6a', '#ff7c43', '#ffa600'];

function formatCounts(data: MessagesCountsDto | UsersCountsDto | undefined) {
  const result: { date: string; total: number }[] = [];

  for (const item of data?.items || []) {
    const clone = {
      date: format(item.date, 'yyyy-MM-dd'),
      total: item.total,
    };
    result.push(clone);
  }
  return result;
}
