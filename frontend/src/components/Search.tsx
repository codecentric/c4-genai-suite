import { ChangeEvent, InputHTMLAttributes, KeyboardEvent, useEffect, useState } from 'react';
import { useEventCallback } from 'src/hooks';
import { cn } from 'src/lib';
import { texts } from 'src/texts';
import { Icon } from './Icon';

interface SearchProps extends InputHTMLAttributes<HTMLInputElement> {
  // The actual value.
  value?: string;

  // When query changed.
  onSearch: (value: string | undefined) => void;
}

export const Search = (props: SearchProps) => {
  const { onSearch, value, ...other } = props;

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

  const doClear = useEventCallback(() => {
    if (hasChanged(value, '') && onSearch) {
      onSearch('');
    }
  });

  return (
    <label className="input input-bordered flex items-center gap-2 rounded-full pr-2">
      <Icon icon="search" size={18} className="text-gray-500" />

      <input {...other} value={search || ''} onChange={doChange} onKeyUp={doPress} placeholder={texts.common.search} />

      <button type="button" className={cn('btn btn-ghost btn-sm rounded-full px-2', { invisible: !search })} onClick={doClear}>
        <Icon icon="close" size={16} className="text-gray-500" />
      </button>
    </label>
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
