import { Button } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useCallback, useEffect, useState } from 'react';
import type { LLMEndpoint } from 'src/api/generated-eval';
import { Page, Pagination, Search } from 'src/components';
import { useEventCallback } from 'src/hooks';
import { texts } from 'src/texts';
import { LlmEndpointsTable } from './components/LlmEndpointsTable';
import { CreateLlmEndpointDialog } from './dialogs/CreateLlmEndpointDialog';
import { DeleteLlmEndpointDialog } from './dialogs/DeleteLlmEndpointDialog';
import { EditLlmEndpointDialog } from './dialogs/EditLlmEndpointDialog';
import { PAGE_SIZE, useLlmEndpoints } from './hooks/useLlmEndpointQueries';
import { useLlmEndpointsStore } from './state';

export function LlmEndpointsPage() {
  const { endpoints, setEndpoints, totalCount } = useLlmEndpointsStore();

  const [page, setPage] = useState(0);
  const [query, setQuery] = useState<string>();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [endpointToEdit, setEndpointToEdit] = useState<LLMEndpoint | null>(null);
  const [endpointToDelete, setEndpointToDelete] = useState<LLMEndpoint | null>(null);

  const handleSearch = useCallback((newQuery: string | undefined) => {
    setQuery(newQuery);
    setPage(0);
  }, []);

  const { data: loadedEndpoints, isFetching, isFetched, refetch } = useLlmEndpoints(page, query);

  useEffect(() => {
    if (loadedEndpoints) {
      setEndpoints(loadedEndpoints, loadedEndpoints.length);
    }
  }, [loadedEndpoints, setEndpoints]);

  const handleChangePage = useEventCallback((newPage: number) => {
    setPage(newPage);
  });

  const handleCloseCreateDialog = useEventCallback(() => {
    setShowCreateDialog(false);
  });

  const handleCreated = useEventCallback(() => {
    void refetch();
  });

  const handleRowClick = useEventCallback((endpoint: LLMEndpoint) => {
    // For now, just open edit dialog
    setEndpointToEdit(endpoint);
  });

  const handleEdit = useEventCallback((endpoint: LLMEndpoint) => {
    setEndpointToEdit(endpoint);
  });

  const handleCloseEditDialog = useEventCallback(() => {
    setEndpointToEdit(null);
  });

  const handleUpdated = useEventCallback(() => {
    void refetch();
  });

  const handleDelete = useEventCallback((endpoint: LLMEndpoint) => {
    setEndpointToDelete(endpoint);
  });

  const handleCloseDeleteDialog = useEventCallback(() => {
    setEndpointToDelete(null);
  });

  const handleDeleted = useEventCallback(() => {
    void refetch();
  });

  return (
    <>
      <Page>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-3xl">{texts.evals.llmEndpoints}</h2>

          <div className="flex gap-4">
            <Search value={query} onSearch={handleSearch} />

            <Button leftSection={<IconPlus />} onClick={() => setShowCreateDialog(true)}>
              {texts.evals.llmEndpoint.create}
            </Button>
          </div>
        </div>

        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <LlmEndpointsTable
              endpoints={endpoints}
              isFetching={isFetching}
              isFetched={isFetched}
              onRowClick={handleRowClick}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isDeleting={!!endpointToDelete}
            />

            <Pagination page={page} pageSize={PAGE_SIZE} total={totalCount} onPage={handleChangePage} />
          </div>
        </div>
      </Page>

      {showCreateDialog && <CreateLlmEndpointDialog onClose={handleCloseCreateDialog} onCreated={handleCreated} />}

      {endpointToEdit && (
        <EditLlmEndpointDialog endpoint={endpointToEdit} onClose={handleCloseEditDialog} onUpdated={handleUpdated} />
      )}

      {endpointToDelete && (
        <DeleteLlmEndpointDialog endpoint={endpointToDelete} onClose={handleCloseDeleteDialog} onDeleted={handleDeleted} />
      )}
    </>
  );
}
