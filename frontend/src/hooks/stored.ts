import { Dispatch, SetStateAction, useCallback, useEffect, useState } from 'react';
import { isMobile } from 'src/pages/utils';

export function useSidebarState(key: string): [boolean, (value: boolean) => void] {
  const [state, setState] = useState(() => {
    if (isMobile()) {
      return false;
    }
    const fromLocalStore = localStorage.getItem(key);
    return fromLocalStore !== 'false';
  });

  const update = useCallback(
    (value: boolean) => {
      setState(value);
      localStorage.setItem(key, `${value}`);
    },
    [key],
  );

  return [state, update];
}

export function usePersistentState<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    const storedValue = localStorage.getItem(key);
    try {
      return storedValue ? (JSON.parse(storedValue) as T) : initialValue;
    } catch (_err) {
      return initialValue;
    }
  });

  useEffect(() => {
    if (state) {
      localStorage.setItem(key, JSON.stringify(state));
    }
  }, [key, state]);

  return [state, setState];
}
