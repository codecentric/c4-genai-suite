import { Button } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Metric } from 'src/api/generated-eval';
import { Page, Pagination, Search } from 'src/components';
import { useEventCallback } from 'src/hooks';
import { texts } from 'src/texts';
import { MetricsTable } from './components/MetricsTable';
import { CreateMetricDialog } from './dialogs/CreateMetricDialog';
import { DeleteMetricDialog } from './dialogs/DeleteMetricDialog';
import { EditMetricDialog } from './dialogs/EditMetricDialog';
import { PAGE_SIZE, useMetrics } from './hooks/useMetricQueries';

export function MetricsPage() {
  const navigate = useNavigate();

  const [page, setPage] = useState(0);
  const [query, setQuery] = useState<string>();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [metricToEdit, setMetricToEdit] = useState<Metric | null>(null);
  const [metricToDelete, setMetricToDelete] = useState<Metric | null>(null);

  const handleSearch = useCallback((newQuery: string | undefined) => {
    setQuery(newQuery);
    setPage(0);
  }, []);

  const { data: loadedMetrics, isFetching, isFetched, refetch } = useMetrics(page, query);

  const handleChangePage = useEventCallback((newPage: number) => {
    setPage(newPage);
  });

  const handleCloseCreateDialog = useEventCallback(() => {
    setShowCreateDialog(false);
  });

  const handleCreated = useEventCallback(() => {
    void refetch();
  });

  const handleRowClick = useEventCallback((metric: Metric) => {
    // Navigate to detail page
    void navigate(`/admin/evals/metrics/${metric.id}`);
  });

  const handleEdit = useEventCallback((metric: Metric) => {
    setMetricToEdit(metric);
  });

  const handleCloseEditDialog = useEventCallback(() => {
    setMetricToEdit(null);
  });

  const handleUpdated = useEventCallback(() => {
    void refetch();
  });

  const handleDelete = useEventCallback((metric: Metric) => {
    setMetricToDelete(metric);
  });

  const handleCloseDeleteDialog = useEventCallback(() => {
    setMetricToDelete(null);
  });

  const handleDeleted = useEventCallback(() => {
    void refetch();
  });

  return (
    <>
      <Page>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-3xl">{texts.evals.metrics}</h2>

          <div className="flex gap-4">
            <Search value={query} onSearch={handleSearch} />

            <Button leftSection={<IconPlus />} onClick={() => setShowCreateDialog(true)}>
              {texts.evals.metric.create}
            </Button>
          </div>
        </div>

        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <MetricsTable
              metrics={loadedMetrics ?? []}
              isFetching={isFetching}
              isFetched={isFetched}
              onRowClick={handleRowClick}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isDeleting={metricToDelete?.id}
            />

            <Pagination page={page} pageSize={PAGE_SIZE} total={loadedMetrics?.length ?? 0} onPage={handleChangePage} />
          </div>
        </div>
      </Page>

      {showCreateDialog && <CreateMetricDialog onClose={handleCloseCreateDialog} onCreated={handleCreated} />}

      {metricToEdit && <EditMetricDialog metric={metricToEdit} onClose={handleCloseEditDialog} onUpdated={handleUpdated} />}

      {metricToDelete && (
        <DeleteMetricDialog metric={metricToDelete} onClose={handleCloseDeleteDialog} onDeleted={handleDeleted} />
      )}
    </>
  );
}
