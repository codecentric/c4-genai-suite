import { Button } from '@mantine/core';
import { IconChevronLeft, IconChevronLeftPipe, IconChevronRight, IconChevronRightPipe } from '@tabler/icons-react';
import { Table as TanTable } from '@tanstack/react-table';
import { texts } from 'src/texts';
import { TData } from './FilterableTable';

export function TablePagination({ table }: { table: TanTable<TData> }) {
  return (
    <Button.Group>
      <Button onClick={() => table.firstPage()} disabled={!table.getCanPreviousPage()}>
        <IconChevronLeftPipe size={18} />
      </Button>
      <Button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
        <IconChevronLeft size={18} />
      </Button>
      <Button.GroupSection variant="subtle">
        {texts.common.page(table.getState().pagination.pageIndex + 1, table.getPageCount() ? table.getPageCount() : 1)}
      </Button.GroupSection>
      <Button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
        <IconChevronRight size={18} />
      </Button>
      <Button onClick={() => table.lastPage()} disabled={!table.getCanNextPage()}>
        <IconChevronRightPipe size={18} />
      </Button>
    </Button.Group>
  );
}
