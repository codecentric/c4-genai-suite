import { Button } from '@mantine/core';
import { IconChevronLeft, IconChevronLeftPipe, IconChevronRight, IconChevronRightPipe } from '@tabler/icons-react';
import { Table as TanTable } from '@tanstack/react-table';
import { texts } from 'src/texts';
import { TData } from './FilterableTable';

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
