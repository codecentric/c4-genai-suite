import { DefaultError, MutationState, UseMutationResult, useMutationState } from '@tanstack/react-query';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Fn<ARGS extends any[], R> = (...args: ARGS) => R;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useEventCallback = <A extends any[], R>(fn: Fn<A, R>): Fn<A, R> => {
  const ref = useRef<Fn<A, R>>(fn);

  useLayoutEffect(() => {
    ref.current = fn;
  });

  return useMemo(
    () =>
      (...args: A): R => {
        return ref.current(...args);
      },
    [],
  );
};

export const useTypedMutationStates = <TData = unknown, TError = DefaultError, TVariables = unknown, TContext = unknown>(
  _: UseMutationResult<TData, TError, TVariables, TContext>,
  mutationKey: string[],
) => useMutationState<MutationState<TData, TError, TVariables, TContext>>({ filters: { mutationKey } });

/**
 * Hook that debounces a value
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
