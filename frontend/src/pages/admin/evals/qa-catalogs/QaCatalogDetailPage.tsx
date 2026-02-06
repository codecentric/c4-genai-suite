import { Button, Menu, Select, Skeleton } from '@mantine/core';
import {
  IconArrowLeft,
  IconChevronDown,
  IconDeviceFloppy,
  IconDownload,
  IconPlus,
  IconTrash,
  IconUpload,
  IconX,
} from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import type { QAPair, QACatalogVersionHistoryItem } from 'src/api/generated-eval';
import { QACatalogStatus } from 'src/api/generated-eval';
import { useEvalApi } from 'src/api/state/apiEvalClient';
import { ConfirmDialog, Page, Pagination } from 'src/components';
import { useEventCallback } from 'src/hooks';
import { texts } from 'src/texts';
import { QaCatalogStatusChip } from './components/QaCatalogStatusChip';
import { QaPairsTable } from './components/QaPairsTable';
import { AddQaPairDialog } from './dialogs/AddQaPairDialog';
import { DownloadQaCatalogDialog } from './dialogs/DownloadQaCatalogDialog';
import { EditQaPairDialog } from './dialogs/EditQaPairDialog';
import { UploadQaCatalogDialog } from './dialogs/UploadQaCatalogDialog';
import { useQaCatalogsStore, type PendingChange } from './state';

const PAGE_SIZE = 20;

export function QaCatalogDetailPage() {
  const { catalogId } = useParams<{ catalogId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const versionId = searchParams.get('version');

  const evalApi = useEvalApi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    setSelectedCatalog,
    qaPairs,
    setQaPairs,
    pendingChanges,
    addPendingChange,
    removePendingChange,
    clearPendingChanges,
    getEffectiveQaPairs,
    hasPendingChanges,
    getPendingChangeCounts,
  } = useQaCatalogsStore();

  const [page, setPage] = useState(0);
  const [editingPair, setEditingPair] = useState<QAPair | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  // Fetch catalog details
  const {
    data: catalog,
    isLoading: isCatalogLoading,
    refetch: refetchCatalog,
  } = useQuery({
    queryKey: ['qaCatalog', catalogId],
    queryFn: () => evalApi.qaCatalog.qaCatalogGet(catalogId!),
    enabled: !!catalogId,
    refetchInterval: (query) => {
      // Poll while generating
      const data = query.state.data;
      if (data?.status === QACatalogStatus.Generating) {
        return 3000;
      }
      return false;
    },
  });

  // Fetch Q&A pairs
  const {
    data: pairsData,
    isLoading: isPairsLoading,
    refetch: refetchPairs,
  } = useQuery({
    queryKey: ['qaPairs', catalogId, page, versionId],
    queryFn: () => evalApi.qaCatalog.qaCatalogGetCatalogQaPairs(catalogId!, page * PAGE_SIZE, PAGE_SIZE),
    enabled: !!catalogId,
  });

  // Fetch version history
  const { data: historyData } = useQuery({
    queryKey: ['qaCatalogHistory', catalogId],
    queryFn: () => evalApi.qaCatalog.qaCatalogGetHistory(catalogId!),
    enabled: !!catalogId,
  });

  useEffect(() => {
    if (catalog) {
      setSelectedCatalog(catalog);
    }
  }, [catalog, setSelectedCatalog]);

  useEffect(() => {
    if (pairsData) {
      setQaPairs(pairsData);
    }
  }, [pairsData, setQaPairs]);

  // Save all pending changes
  const saveMutation = useMutation({
    mutationFn: async () => {
      const additions = pendingChanges
        .filter((c): c is Extract<PendingChange, { type: 'addition' }> => c.type === 'addition')
        .map((c) => c.data);

      const updates = pendingChanges
        .filter((c): c is Extract<PendingChange, { type: 'update' }> => c.type === 'update')
        .map((c) => c.data);

      const deletions = pendingChanges
        .filter((c): c is Extract<PendingChange, { type: 'deletion' }> => c.type === 'deletion')
        .map((c) => c.id);

      return evalApi.qaCatalog.qaCatalogEditQaCatalog(catalogId!, {
        additions,
        updates,
        deletions,
      });
    },
    onSuccess: (newCatalog) => {
      toast.success(texts.evals.qaCatalog.changesSaved);
      clearPendingChanges();
      void queryClient.invalidateQueries({ queryKey: ['qaCatalogs'] });
      // Navigate to the new catalog ID since edit creates a new version
      if (newCatalog.id !== catalogId) {
        void navigate(`/admin/evals/qa-catalogs/${newCatalog.id}`, { replace: true });
      } else {
        void refetchCatalog();
        void refetchPairs();
        void queryClient.invalidateQueries({ queryKey: ['qaCatalogHistory', catalogId] });
      }
    },
    onError: () => {
      toast.error(texts.evals.qaCatalog.changesSaveFailed);
    },
  });

  // Delete catalog
  const deleteMutation = useMutation({
    mutationFn: () => evalApi.qaCatalog.qaCatalogDelete(catalogId!),
    onSuccess: () => {
      toast.success(texts.evals.qaCatalog.deleteSuccess);
      void queryClient.invalidateQueries({ queryKey: ['qaCatalogs'] });
      void navigate('/admin/evals/qa-catalogs');
    },
    onError: () => {
      toast.error(texts.evals.qaCatalog.deleteFailed);
    },
  });

  const effectivePairs = useMemo(() => getEffectiveQaPairs(), [getEffectiveQaPairs]);
  const pendingCounts = useMemo(() => getPendingChangeCounts(), [getPendingChangeCounts]);
  const hasChanges = hasPendingChanges();

  const handleVersionChange = useEventCallback((value: string | null) => {
    if (value) {
      setSearchParams({ version: value });
    } else {
      setSearchParams({});
    }
    clearPendingChanges();
    setPage(0);
  });

  const handleEdit = useEventCallback((pair: QAPair) => {
    setEditingPair(pair);
  });

  const handleDelete = useEventCallback((pair: QAPair) => {
    // Check if it's a pending addition (temp id)
    const isAddition = pendingChanges.some((c) => c.type === 'addition' && c.tempId === pair.id);

    if (isAddition) {
      removePendingChange(pair.id);
    } else {
      const original = qaPairs.find((p) => p.id === pair.id);
      if (original) {
        addPendingChange({ type: 'deletion', id: pair.id, original });
      }
    }
  });

  const handleUndo = useEventCallback((pairId: string) => {
    removePendingChange(pairId);
  });

  const handleSaveEdit = useEventCallback((pair: QAPair) => {
    // Check if it's a pending addition
    const additionIndex = pendingChanges.findIndex((c) => c.type === 'addition' && c.tempId === pair.id);

    if (additionIndex >= 0) {
      // Update the pending addition
      removePendingChange(pair.id);
      addPendingChange({
        type: 'addition',
        tempId: pair.id,
        data: {
          question: pair.question,
          expectedOutput: pair.expectedOutput,
          contexts: pair.contexts,
        },
      });
    } else {
      // It's an existing pair - find the original
      const original = qaPairs.find((p) => p.id === pair.id);
      if (original) {
        addPendingChange({ type: 'update', id: pair.id, data: pair, original });
      }
    }
    setEditingPair(null);
  });

  const handleAddPair = useEventCallback((data: { question: string; expectedOutput: string; contexts: string[] }) => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    addPendingChange({
      type: 'addition',
      tempId,
      data,
    });
    setShowAddDialog(false);
  });

  const handleUploadSuccess = useEventCallback(() => {
    void refetchCatalog();
    void refetchPairs();
    void queryClient.invalidateQueries({ queryKey: ['qaCatalogHistory', catalogId] });
    setShowUploadDialog(false);
  });

  const versionOptions = useMemo(() => {
    if (!historyData?.versions) return [];
    return historyData.versions.map((v: QACatalogVersionHistoryItem) => ({
      value: v.versionId,
      label: `v${v.revision} - ${v.createdAt.toLocaleDateString()}`,
    }));
  }, [historyData]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isCatalogLoading) {
    return (
      <Page>
        <div className="mb-4">
          <Skeleton height={32} width={300} />
        </div>
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <Skeleton height={400} />
          </div>
        </div>
      </Page>
    );
  }

  if (!catalog) {
    return (
      <Page>
        <div className="py-12 text-center">
          <p className="text-lg text-gray-500">{texts.evals.qaCatalog.errorNotFound}</p>
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={18} />}
            className="mt-4"
            onClick={() => navigate('/admin/evals/qa-catalogs')}
          >
            {texts.evals.qaCatalogs}
          </Button>
        </div>
      </Page>
    );
  }

  return (
    <>
      <Page>
        {/* Header */}
        <div className="mb-4">
          <div className="mb-2 flex items-center gap-2">
            <Button
              variant="subtle"
              size="sm"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => navigate('/admin/evals/qa-catalogs')}
            >
              {texts.evals.qaCatalogs}
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-3xl">{catalog.name}</h2>
              <QaCatalogStatusChip status={catalog.status} error={catalog.error} />
            </div>

            <div className="flex items-center gap-2">
              {/* Version selector */}
              {versionOptions.length > 0 && (
                <Select
                  placeholder={texts.evals.qaCatalog.versionSelect}
                  data={versionOptions}
                  value={versionId}
                  onChange={handleVersionChange}
                  clearable
                  className="w-48"
                />
              )}

              {/* Actions menu */}
              <Menu shadow="md" width={200}>
                <Menu.Target>
                  <Button variant="outline" rightSection={<IconChevronDown size={16} />}>
                    {texts.evals.qaCatalog.actions}
                  </Button>
                </Menu.Target>

                <Menu.Dropdown>
                  <Menu.Item leftSection={<IconDownload size={16} />} onClick={() => setShowDownloadDialog(true)}>
                    {texts.evals.qaCatalog.downloadCatalog}
                  </Menu.Item>
                  <Menu.Item leftSection={<IconUpload size={16} />} onClick={() => setShowUploadDialog(true)}>
                    {texts.evals.qaCatalog.uploadTitle}
                  </Menu.Item>
                  <Menu.Divider />
                  <ConfirmDialog
                    title={texts.evals.qaCatalog.deleteConfirmTitle}
                    text={texts.evals.qaCatalog.deleteConfirmText(catalog.name)}
                    onPerform={() => deleteMutation.mutate()}
                  >
                    {({ onClick }) => (
                      <Menu.Item color="red" leftSection={<IconTrash size={16} />} onClick={onClick}>
                        {texts.evals.qaCatalog.deleteCatalog}
                      </Menu.Item>
                    )}
                  </ConfirmDialog>
                </Menu.Dropdown>
              </Menu>

              <Button leftSection={<IconPlus size={16} />} onClick={() => setShowAddDialog(true)}>
                {texts.evals.qaCatalog.addQaPair}
              </Button>
            </div>
          </div>

          {/* Metadata */}
          <div className="mt-2 flex gap-4 text-sm text-gray-500">
            <span>
              {texts.evals.qaCatalog.revision}: {catalog.revision}
            </span>
            <span>
              {texts.evals.qaCatalog.createdAt}: {formatDate(catalog.createdAt)}
            </span>
            <span>
              {texts.evals.qaCatalog.updatedAt}: {formatDate(catalog.updatedAt)}
            </span>
          </div>
        </div>

        {/* Pending changes bar */}
        {hasChanges && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-yellow-200 bg-yellow-50 p-3">
            <div className="flex items-center gap-4 text-sm">
              <span className="font-medium">{texts.evals.qaCatalog.pendingChanges(pendingChanges.length)}</span>
              {pendingCounts.additions > 0 && (
                <span className="text-green-600">
                  +{pendingCounts.additions} {texts.evals.qaCatalog.pendingAdditions(pendingCounts.additions)}
                </span>
              )}
              {pendingCounts.updates > 0 && (
                <span className="text-blue-600">
                  ~{pendingCounts.updates} {texts.evals.qaCatalog.pendingUpdates(pendingCounts.updates)}
                </span>
              )}
              {pendingCounts.deletions > 0 && (
                <span className="text-red-600">
                  -{pendingCounts.deletions} {texts.evals.qaCatalog.pendingDeletions(pendingCounts.deletions)}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <ConfirmDialog
                title={texts.evals.qaCatalog.cancelAllChanges}
                text={texts.evals.qaCatalog.discardChangesConfirm(pendingChanges.length)}
                onPerform={clearPendingChanges}
              >
                {({ onClick }) => (
                  <Button variant="subtle" size="sm" leftSection={<IconX size={16} />} onClick={onClick}>
                    {texts.evals.qaCatalog.cancelAllChanges}
                  </Button>
                )}
              </ConfirmDialog>
              <Button
                size="sm"
                leftSection={<IconDeviceFloppy size={16} />}
                onClick={() => saveMutation.mutate()}
                loading={saveMutation.isPending}
              >
                {texts.evals.qaCatalog.saveAllChanges}
              </Button>
            </div>
          </div>
        )}

        {/* Q&A Pairs Table */}
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            {isPairsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }, (_, i) => (
                  <Skeleton key={i} height={60} />
                ))}
              </div>
            ) : (
              <>
                <QaPairsTable
                  pairs={effectivePairs}
                  pendingChanges={pendingChanges}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onUndo={handleUndo}
                />

                {effectivePairs.length === 0 && (
                  <div className="py-8 text-center text-gray-500">{texts.evals.qaCatalog.noQaPairs}</div>
                )}

                <Pagination page={page} pageSize={PAGE_SIZE} total={qaPairs.length + pendingCounts.additions} onPage={setPage} />
              </>
            )}
          </div>
        </div>
      </Page>

      {/* Dialogs */}
      {editingPair && <EditQaPairDialog pair={editingPair} onClose={() => setEditingPair(null)} onSave={handleSaveEdit} />}

      {showAddDialog && <AddQaPairDialog onClose={() => setShowAddDialog(false)} onAdd={handleAddPair} />}

      {showDownloadDialog && (
        <DownloadQaCatalogDialog
          catalogId={catalogId!}
          catalogName={catalog.name}
          versions={historyData?.versions || []}
          onClose={() => setShowDownloadDialog(false)}
        />
      )}

      {showUploadDialog && (
        <UploadQaCatalogDialog
          catalogId={catalogId!}
          onClose={() => setShowUploadDialog(false)}
          onSuccess={handleUploadSuccess}
        />
      )}
    </>
  );
}
