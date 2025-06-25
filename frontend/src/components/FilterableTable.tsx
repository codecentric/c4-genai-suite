import { Button } from '@mantine/core';
import { IconSortAscending, IconSortDescending } from '@tabler/icons-react';
import { flexRender, Table as TanTable } from '@tanstack/react-table';
import { FileDto } from 'src/api';
import { cn } from 'src/lib';
import { texts } from 'src/texts';
import { ConfirmDialog } from './ConfirmDialog';
import { DebouncedInput } from './TableFilter';

export type TData = FileDto;

export type FilterableTableProps = {
  table: TanTable<TData>;
  handleMultiDelete: () => void;
  deleteDialogTitle: string;
  deleteDialogText: string;
  deleteDisabled: boolean;
  globalFilter: string;
  setGlobalFilter: (filter: string) => void;
};

export function FilterableTable(props: FilterableTableProps) {
  const containerClass = 'flex flex-row items-center justify-between';

  return (
    <div className="relative flex w-full flex-col overflow-x-scroll rounded-xl bg-white bg-clip-border p-2 shadow-sm">
      <div>
        <DebouncedInput
          value={props.globalFilter ?? ''}
          onChange={(value) => props.setGlobalFilter(String(value))}
          className="text-md mb-4 w-auto rounded border px-1 font-normal shadow-xs placeholder:text-xs"
          placeholder={'Search... / Suche...'}
        />
      </div>
      <table className="w-full min-w-max table-auto border-collapse">
        <thead>
          {props.table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <th key={header.id} colSpan={header.colSpan} className="border-b border-gray-300 px-2 py-1">
                    {header.isPlaceholder ? null : (
                      <div className={cn(containerClass)}>
                        <div className="flex flex-col">
                          <div className="text-sm font-bold">
                            {flexRender(header.column.columnDef.header, header.getContext())}
                          </div>
                        </div>
                        <div
                          {...{
                            className: header.column.getCanSort() ? 'cursor-pointer select-none' : '',
                            onClick: header.column.getToggleSortingHandler(),
                          }}
                        >
                          {header.column.getCanSort()
                            ? ({
                                asc: <IconSortAscending className="text-primary font-extrabold" size={18} />,
                                desc: <IconSortDescending className="text-primary font-extrabold" size={18} />,
                              }[header.column.getIsSorted() as string] ?? (
                                <IconSortAscending className="text-gray-300" size={18} />
                              ))
                            : null}
                        </div>
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {props.table.getRowModel().rows.map((row) => {
            return (
              <tr key={row.id} className="border-t border-gray-200">
                {row.getVisibleCells().map((cell) => {
                  return (
                    <td
                      key={cell.id}
                      className="w-fit max-w-72 overflow-hidden p-2 text-sm font-normal text-nowrap overflow-ellipsis"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="flex flex-row items-center justify-between gap-x-2 border-t border-gray-300 p-2 text-sm">
        <div className="text-gray-500">{`${props.table.getSelectedRowModel().rows.length} Rows Selected`}</div>
        <ConfirmDialog title={props.deleteDialogTitle} text={props.deleteDialogText} onPerform={() => props.handleMultiDelete()}>
          {({ onClick }) => (
            <Button variant="light" color="red" onClick={onClick} size="xs" disabled={props.deleteDisabled}>
              {texts.common.remove}
            </Button>
          )}
        </ConfirmDialog>
      </div>
    </div>
  );
}
