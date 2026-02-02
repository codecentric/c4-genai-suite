import { Button, Skeleton } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import type { QACatalogPreview } from 'src/api/generated-eval';
import { useEvalApi } from 'src/api/state/apiEvalClient';
import { ConfirmDialog, Page, Pagination, Search } from 'src/components';
import { useEventCallback } from 'src/hooks';
import { texts } from 'src/texts';
import { QaCatalogStatusChip } from './components/QaCatalogStatusChip';
import { CreateQaCatalogDialog } from './dialogs/CreateQaCatalogDialog';
import { useQaCatalogsStore } from './state';

const PAGE_SIZE = 20;

export function QaCatalogsPage() {
  const evalApi = useEvalApi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { catalogs, setCatalogs, removeCatalogFromList, totalCount } = useQaCatalogsStore();

  const [page, setPage] = useState(0);
  const [query, setQuery] = useState<string>();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const handleSearch = useCallback((newQuery: string | undefined) => {
    setQuery(newQuery);
    setPage(0);
  }, []);

  const {
    data: loadedCatalogs,
    isFetching,
    isFetched,
    refetch,
  } = useQuery({
    queryKey: ['qaCatalogs', page, query],
    queryFn: () =>
      evalApi.qaCatalog.qaCatalogGetAll(query || undefined, page * PAGE_SIZE, PAGE_SIZE),
  });

  useEffect(() => {
    if (loadedCatalogs) {
      setCatalogs(loadedCatalogs, loadedCatalogs.length);
    }
  }, [loadedCatalogs, setCatalogs]);

  const deleteMutation = useMutation({
    mutationFn: (catalogId: string) => evalApi.qaCatalog.qaCatalogDelete(catalogId),
    onSuccess: (_, catalogId) => {
      removeCatalogFromList(catalogId);
      toast.success(texts.evals.qaCatalog.deleteSuccess);
      queryClient.invalidateQueries({ queryKey: ['qaCatalogs'] });
    },
    onError: () => {
      toast.error(texts.evals.qaCatalog.deleteFailed);
    },
  });

  const handleChangePage = useEventCallback((newPage: number) => {
    setPage(newPage);
  });

  const handleCloseCreateDialog = useEventCallback(() => {
    setShowCreateDialog(false);
  });

  const handleCreated = useEventCallback(() => {
    refetch();
  });

  const handleRowClick = useEventCallback((catalog: QACatalogPreview) => {
    navigate(`/admin/evals/qa-catalogs/${catalog.id}`);
  });

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <>
      <Page>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-3xl">{texts.evals.qaCatalogs}</h2>

          <div className="flex gap-4">
            <Search value={query} onSearch={handleSearch} />

            <Button leftSection={<IconPlus />} onClick={() => setShowCreateDialog(true)}>
              {texts.evals.qaCatalog.create}
            </Button>
          </div>
        </div>

        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <table className="table table-fixed text-base">
              <thead>
                <tr>
                  <th>{texts.evals.qaCatalog.name}</th>
                  <th className="w-28">{texts.evals.qaCatalog.length}</th>
                  <th className="w-32">{texts.evals.qaCatalog.status}</th>
                  <th className="w-36">{texts.evals.qaCatalog.createdAt}</th>
                  <th className="w-36">{texts.evals.qaCatalog.updatedAt}</th>
                  <th className="w-20">{texts.evals.qaCatalog.actions}</th>
                </tr>
              </thead>
              <tbody>
                {isFetching && !isFetched && (
                  <>
                    {[...Array(5)].map((_, i) => (
                      <tr key={i}>
                        <td><Skeleton height={20} /></td>
                        <td><Skeleton height={20} /></td>
                        <td><Skeleton height={20} /></td>
                        <td><Skeleton height={20} /></td>
                        <td><Skeleton height={20} /></td>
                        <td><Skeleton height={20} /></td>
                      </tr>
                    ))}
                  </>
                )}

                {isFetched && catalogs.map((catalog) => (
                  <tr
                    className="cursor-pointer hover:bg-gray-50"
                    key={catalog.id}
                    onClick={() => handleRowClick(catalog)}
                  >
                    <td className="truncate overflow-hidden font-semibold">{catalog.name}</td>
                    <td className="overflow-hidden">{catalog.length}</td>
                    <td className="overflow-hidden">
                      <QaCatalogStatusChip status={catalog.status} />
                    </td>
                    <td className="overflow-hidden">{formatDate(catalog.createdAt)}</td>
                    <td className="overflow-hidden">{formatDate(catalog.updatedAt)}</td>
                    <td className="overflow-hidden">
                      <ConfirmDialog
                        title={texts.evals.qaCatalog.deleteConfirmTitle}
                        text={texts.evals.qaCatalog.deleteConfirmText(catalog.name)}
                        onPerform={() => deleteMutation.mutate(catalog.id)}
                      >
                        {({ onClick }) => (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm text-error"
                            onClick={(e) => {
                              e.stopPropagation();
                              onClick();
                            }}
                            disabled={deleteMutation.isPending}
                          >
                            <IconTrash size={18} />
                          </button>
                        )}
                      </ConfirmDialog>
                    </td>
                  </tr>
                ))}

                {isFetched && catalogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8">
                      <div className="text-gray-500">
                        <p className="mb-2">{texts.evals.qaCatalog.empty}</p>
                        <p className="text-sm">{texts.evals.qaCatalog.emptyHint}</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={totalCount}
              onPage={handleChangePage}
            />
          </div>
        </div>
      </Page>

      {showCreateDialog && (
        <CreateQaCatalogDialog onClose={handleCloseCreateDialog} onCreated={handleCreated} />
      )}
    </>
  );
}
