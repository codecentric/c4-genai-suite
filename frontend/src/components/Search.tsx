import { TextInput } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { ChangeEvent, InputHTMLAttributes, KeyboardEvent, useEffect, useState } from 'react';
import { useEventCallback } from 'src/hooks';
import { texts } from 'src/texts';

interface SearchProps extends InputHTMLAttributes<HTMLInputElement> {
  // The actual value.
  value?: string;

  // When query changed.
  onSearch: (value: string | undefined) => void;
}

export const Search = (props: SearchProps) => {
  const { onSearch, value } = props;

  const [search, setSearch] = useState<string>();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (hasChanged(value, search) && onSearch) {
        onSearch(search);
      }
    }, 300);

    return () => {
      clearInterval(timer);
    };
  }, [search, onSearch, value]);

  useEffect(() => {
    setSearch(value);
  }, [value]);

  const doChange = useEventCallback((event: ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
  });

  const doPress = useEventCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (hasChanged(value, search) && onSearch && isEnter(event)) {
      onSearch(search);
    }
  });

  return (
    <TextInput
      leftSection={<IconSearch />}
      placeholder={texts.common.search}
      value={search || ''}
      onChange={doChange}
      onKeyUp={doPress}
    />
  );
};

function isEnter(event: KeyboardEvent<HTMLInputElement>) {
  return event.key === 'Enter' || event.keyCode === 13;
}

function hasChanged(lhs: string | undefined | null, rhs: string | undefined | null) {
  if (!lhs && !rhs) {
    return false;
  }

  return lhs !== rhs;
}
