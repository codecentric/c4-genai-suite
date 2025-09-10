import { TagsInput } from '@mantine/core';
import { UseFormReturnType } from '@mantine/form';
import { useQuery } from '@tanstack/react-query';
import { useApi } from 'src/api';
import { texts } from 'src/texts';

type UserGroupTagsInputFormValues = { userGroupIds?: string[] };

type UserGroupTagsProps<T> = { form: UseFormReturnType<T> };

function uniqBy<T, TValue>(array: T[], iteratee: ((item: T) => TValue) | keyof T): T[] {
  const seen = new Set<TValue | T[keyof T]>();
  const getKey = typeof iteratee === 'function' ? iteratee : (item: T) => item[iteratee];

  const result: T[] = [];
  for (const item of array) {
    const key = getKey(item);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }

  return result;
}

export function UserGroupTagsInput<T extends UserGroupTagsInputFormValues>({ form }: UserGroupTagsProps<T>) {
  const api = useApi();

  const { data: userGroups } = useQuery({
    queryKey: ['userGroups'],
    queryFn: () => api.users.getUserGroups(),
    select: (data) => ({ items: uniqBy(data.items, 'name') }),
  });

  const selectedGroupNames = form
    .getValues()
    .userGroupIds?.map((id) => userGroups?.items.find((group) => group.id === id)?.name ?? '')
    .filter(Boolean);

  const handleTagChange = (selectedNames: string[]) => {
    const selectedIds = userGroups?.items.filter((group) => selectedNames.includes(group.name)).map((group) => group.id) ?? [];
    form.setValues({ ...form.values, userGroupIds: selectedIds });
  };

  const inputProps = {
    ...form.getInputProps('userGroupIds'),
    value: selectedGroupNames,
    onChange: handleTagChange,
  };
  const suggestions = userGroups?.items.map((group) => group.name) ?? [];
  return (
    <TagsInput
      description={texts.extensions.userGroupsHints}
      label={texts.common.userGroups}
      {...inputProps}
      comboboxProps={{ radius: 'md' }}
      data={suggestions}
    />
  );
}
