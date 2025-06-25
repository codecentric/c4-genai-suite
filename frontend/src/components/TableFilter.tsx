/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Column } from '@tanstack/react-table';
import { useEffect, useMemo, useState } from 'react';
import { TData } from './FilterableTable';

export function TableFilter({ column }: { column: Column<TData, unknown> }) {
  const { filterVariant } = column.columnDef.meta ?? {};

  const columnFilterValue = column.getFilterValue();
  const columnFacetedUniqueValues = column.getFacetedUniqueValues();

  const sortedUniqueValues = useMemo(
    () => (filterVariant === 'range' ? [] : Array.from(columnFacetedUniqueValues.keys()).sort().slice(0, 5000)),
    [columnFacetedUniqueValues, filterVariant],
  );

  return filterVariant === 'range' ? (
    <div>
      <div className="flex space-x-2">
        <DebouncedInput
          type="number"
          min={Number(column.getFacetedMinMaxValues()?.[0] ?? '')}
          max={Number(column.getFacetedMinMaxValues()?.[1] ?? '')}
          value={(columnFilterValue as [number, number])?.[0] ?? ''}
          onChange={(value) => column.setFilterValue((old: [number, number]) => [value, old?.[1]])}
          placeholder={`Min ${
            column.getFacetedMinMaxValues()?.[0] !== undefined ? `(${column.getFacetedMinMaxValues()?.[0]})` : ''
          }`}
          className="w-18 rounded border font-normal shadow-sm placeholder:text-xs placeholder:font-normal"
        />
        <DebouncedInput
          type="number"
          min={Number(column.getFacetedMinMaxValues()?.[0] ?? '')}
          max={Number(column.getFacetedMinMaxValues()?.[1] ?? '')}
          value={(columnFilterValue as [number, number])?.[1] ?? ''}
          onChange={(value) => column.setFilterValue((old: [number, number]) => [old?.[0], value])}
          placeholder={`Max ${column.getFacetedMinMaxValues()?.[1] ? `(${column.getFacetedMinMaxValues()?.[1]})` : ''}`}
          className="w-18 rounded border text-xs font-normal shadow-sm placeholder:text-xs placeholder:font-normal"
        />
      </div>
      <div className="h-1" />
    </div>
  ) : filterVariant === 'select' ? (
    <select
      onChange={(e) => column.setFilterValue(e.target.value)}
      value={columnFilterValue?.toString()}
      className="w-16 rounded-sm border font-normal shadow-xs"
    >
      <option value="">All</option>
      {sortedUniqueValues.map((value) => (
        //dynamically generated select options from faceted values feature
        <option value={value} key={value}>
          {value}
        </option>
      ))}
    </select>
  ) : (
    filterVariant == 'text' && (
      <>
        {/* Autocomplete suggestions from faceted values feature */}
        <datalist id={column.id + 'list'}>
          {sortedUniqueValues.map((value: any) => (
            <option value={value} key={value} />
          ))}
        </datalist>
        <DebouncedInput
          type="text"
          value={(columnFilterValue ?? '') as string}
          onChange={(value) => column.setFilterValue(value)}
          placeholder={`Search... (${column.getFacetedUniqueValues().size})`}
          className="w-auto rounded border text-sm font-normal shadow-xs placeholder:text-xs"
          list={column.id + 'list'}
        />
        <div className="h-1" />
      </>
    )
  );
}

export function DebouncedInput({
  value: initialValue,
  onChange,
  debounce = 500,
  ...props
}: {
  value: string | number;
  onChange: (value: string | number) => void;
  debounce?: number;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(value);
    }, debounce);

    return () => clearTimeout(timeout);
  }, [debounce, onChange, value]);

  return <input {...props} value={value} onChange={(e) => setValue(e.target.value)} />;
}
