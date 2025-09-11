import { texts } from 'src/texts';

interface PaginationProps {
  // The current page.
  page: number;

  // The current page size.
  pageSize: number;

  // The total number of items.
  total: number;

  // Invoked when the page has been changed.
  onPage: (page: number) => void;
}

export function Pagination(props: PaginationProps) {
  const { onPage, page, pageSize, total } = props;

  const numberOfPages = Math.ceil(total / pageSize);

  const canGoPrev = page > 0;
  const canGoNext = page < numberOfPages - 1;

  if (!canGoNext && !canGoPrev) {
    return null;
  }

  return (
    <div className="flex flex-row justify-end">
      <div className="join mt-4">
        <button className="btn join-item btn-sm" onClick={() => onPage(page - 1)} disabled={!canGoPrev}>
          «
        </button>
        <button className="btn join-item btn-sm">{texts.common.page(page + 1, numberOfPages)}</button>
        <button className="btn join-item btn-sm" onClick={() => onPage(page + 1)} disabled={!canGoNext}>
          »
        </button>
      </div>
    </div>
  );
}
