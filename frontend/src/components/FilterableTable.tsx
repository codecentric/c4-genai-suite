import { Button } from '@mantine/core';
import {
  IconChevronLeft,
  IconChevronLeftPipe,
  IconChevronRight,
  IconChevronRightPipe,
  IconSortAscending,
  IconSortDescending,
} from '@tabler/icons-react';
import { flexRender, Table as TanTable } from '@tanstack/react-table';
import { FileDto } from 'src/api';
import { cn } from 'src/lib';
import { texts } from 'src/texts';

export type TData = FileDto;

export type FilterableTableProps = {
  table: TanTable<TData>;
};

export function FilterableTable(props: FilterableTableProps) {
  const containerClass = 'flex flex-row items-center justify-between';

  return (
    <div className="flex w-full flex-col">
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
              <tr key={row.id} className="border-t border-gray-200 hover:bg-gray-50">
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
    </div>
  );
}

export function TablePagination(props: { table: TanTable<TData> }) {
  return (
    <Button.Group>
      <Button onClick={() => props.table.firstPage()} disabled={!props.table.getCanPreviousPage()}>
        <IconChevronLeftPipe size={18} />
      </Button>
      <Button onClick={() => props.table.previousPage()} disabled={!props.table.getCanPreviousPage()}>
        <IconChevronLeft size={18} />
      </Button>
      <Button.GroupSection variant="subtle">
        {texts.common.page(props.table.getState().pagination.pageIndex + 1, props.table.getPageCount())}
      </Button.GroupSection>
      <Button onClick={() => props.table.nextPage()} disabled={!props.table.getCanNextPage()}>
        <IconChevronRight size={18} />
      </Button>
      <Button onClick={() => props.table.lastPage()} disabled={!props.table.getCanNextPage()}>
        <IconChevronRightPipe size={18} />
      </Button>
    </Button.Group>
  );
}
