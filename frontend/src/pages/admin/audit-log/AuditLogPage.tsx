import { Badge, Modal, Select } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { create } from 'jsondiffpatch';
import { format as formatHtmlDiff } from 'jsondiffpatch/formatters/html';
import { useCallback, useMemo, useState } from 'react';
import { useApi } from 'src/api';
import { AuditLogDto, GetAuditLogsEntityTypeEnum } from 'src/api/generated';
import { Page, Pagination } from 'src/components';
import { texts } from 'src/texts';

const PAGE_SIZE = 20;

const diffpatcher = create({
  objectHash: (obj: object) => {
    if ('id' in obj) {
      return String((obj as { id: unknown }).id);
    }
    return JSON.stringify(obj);
  },
});

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getEntityName(auditLog: AuditLogDto): string {
  const snapshot = auditLog.snapshot as Record<string, unknown>;

  // For extensions, show the assistant/configuration name
  if (auditLog.entityType === 'extension') {
    if (typeof snapshot.configurationName === 'string' && snapshot.configurationName) {
      return snapshot.configurationName;
    }
    // Fallback to extension name if no configuration name
    if (typeof snapshot.name === 'string' && snapshot.name) {
      return snapshot.name;
    }
  }

  // Try common name fields
  if (typeof snapshot.name === 'string' && snapshot.name) {
    return snapshot.name;
  }
  if (typeof snapshot.title === 'string' && snapshot.title) {
    return snapshot.title;
  }

  // Fallback for entities without names
  const fallbacks: Record<string, string> = {
    settings: texts.auditLog.settings,
    extension: texts.auditLog.extension,
    bucket: texts.auditLog.bucket,
    configuration: texts.auditLog.configuration,
    userGroup: texts.auditLog.userGroup,
    user: texts.auditLog.user,
  };

  return fallbacks[auditLog.entityType] ?? auditLog.entityType;
}

function EntityTypeBadge({ entityType }: { entityType: string }) {
  const config: Record<string, { color: string; label: string }> = {
    extension: { color: 'blue', label: texts.auditLog.extension },
    bucket: { color: 'green', label: texts.auditLog.bucket },
    configuration: { color: 'violet', label: texts.auditLog.configuration },
    settings: { color: 'pink', label: texts.auditLog.settings },
    userGroup: { color: 'cyan', label: texts.auditLog.userGroup },
    user: { color: 'grape', label: texts.auditLog.user },
  };
  const { color, label } = config[entityType] ?? { color: 'gray', label: entityType };
  return <Badge color={color}>{label}</Badge>;
}

function ActionBadge({ action }: { action: string }) {
  const config: Record<string, { color: string; label: string }> = {
    create: { color: 'teal', label: texts.auditLog.create },
    update: { color: 'orange', label: texts.auditLog.update },
    delete: { color: 'red', label: texts.auditLog.delete },
  };
  const { color, label } = config[action] ?? { color: 'gray', label: action };
  return <Badge color={color}>{label}</Badge>;
}

function DiffView({ currentSnapshot, previousSnapshot }: { currentSnapshot: object; previousSnapshot: object | null }) {
  const diffHtml = useMemo(() => {
    if (!previousSnapshot) {
      return null;
    }

    const delta = diffpatcher.diff(previousSnapshot, currentSnapshot);

    if (!delta) {
      return null;
    }

    return formatHtmlDiff(delta, previousSnapshot);
  }, [currentSnapshot, previousSnapshot]);

  if (!previousSnapshot) {
    return <div className="rounded bg-blue-50 p-4 text-sm text-blue-700">{texts.auditLog.noPreviousSnapshot}</div>;
  }

  if (!diffHtml) {
    return <div className="rounded bg-gray-100 p-4 text-sm text-gray-500">{texts.auditLog.noChanges}</div>;
  }

  return (
    <div
      className="jsondiffpatch-unchanged-hidden overflow-auto rounded border p-4"
      dangerouslySetInnerHTML={{ __html: diffHtml }}
    />
  );
}

function DetailsModal({
  auditLog,
  previousLog,
  onClose,
}: {
  auditLog: AuditLogDto | null;
  previousLog: AuditLogDto | null;
  onClose: () => void;
}) {
  if (!auditLog) return null;

  const isCreate = auditLog.action === 'create';
  const isDelete = auditLog.action === 'delete';
  const entityName = getEntityName(auditLog);
  const snapshot = auditLog.snapshot as Record<string, unknown>;
  const isExtension = auditLog.entityType === 'extension';
  const extensionName = isExtension && typeof snapshot.name === 'string' ? snapshot.name : null;
  const configurationName = isExtension && typeof snapshot.configurationName === 'string' ? snapshot.configurationName : null;
  const configurationId =
    isExtension && (typeof snapshot.configurationId === 'string' || typeof snapshot.configurationId === 'number')
      ? String(snapshot.configurationId)
      : null;

  return (
    <Modal opened={!!auditLog} onClose={onClose} title={texts.auditLog.snapshotDetails} size="lg">
      <div className="mb-4 flex flex-wrap gap-4">
        <div>
          <span className="text-sm text-gray-500">{texts.auditLog.entityType}:</span>{' '}
          <EntityTypeBadge entityType={auditLog.entityType} />
        </div>
        <div>
          <span className="text-sm text-gray-500">{texts.auditLog.action}:</span> <ActionBadge action={auditLog.action} />
        </div>
      </div>
      {isExtension && configurationName && (
        <div className="mb-4">
          <span className="text-sm text-gray-500">{texts.auditLog.configuration}:</span>{' '}
          <span className="font-semibold">{configurationName}</span>
          {configurationId && <span className="ml-2 text-sm text-gray-400">({configurationId})</span>}
        </div>
      )}
      {isExtension && extensionName && (
        <div className="mb-4">
          <span className="text-sm text-gray-500">{texts.auditLog.extension}:</span> <span>{extensionName}</span>
          <span className="ml-2 text-sm text-gray-400">({auditLog.entityId})</span>
        </div>
      )}
      {!isExtension && (
        <div className="mb-4">
          <span className="text-sm text-gray-500">{texts.auditLog.entityName}:</span>{' '}
          <span className="font-semibold">{entityName}</span>
          <span className="ml-2 text-sm text-gray-400">({auditLog.entityId})</span>
        </div>
      )}
      <div className="mb-4">
        <span className="text-sm text-gray-500">{texts.auditLog.user}:</span> <span>{auditLog.userName || auditLog.userId}</span>
      </div>
      <div className="mb-4">
        <span className="text-sm text-gray-500">{texts.auditLog.timestamp}:</span> <span>{formatDate(auditLog.createdAt)}</span>
      </div>

      <div className="max-h-96 overflow-auto">
        {isCreate ? (
          <div className="rounded bg-green-50 p-4 text-sm text-green-700">{texts.auditLog.entityCreated}</div>
        ) : isDelete ? (
          <div className="rounded bg-red-50 p-4 text-sm text-red-700">{texts.auditLog.entityDeleted}</div>
        ) : (
          <DiffView currentSnapshot={auditLog.snapshot} previousSnapshot={previousLog?.snapshot ?? null} />
        )}
      </div>
    </Modal>
  );
}

function truncateId(id: string, length: number = 6): string {
  if (id.length <= length) return id;
  return id.substring(0, length) + '…';
}

export function AuditLogPage() {
  const api = useApi();
  const [page, setPage] = useState(0);
  const [entityTypeFilter, setEntityTypeFilter] = useState<GetAuditLogsEntityTypeEnum | undefined>(undefined);
  const [configurationFilter, setConfigurationFilter] = useState<number | undefined>(undefined);
  const [selectedLog, setSelectedLog] = useState<AuditLogDto | null>(null);

  const { data: configurations } = useQuery({
    queryKey: ['configurations'],
    queryFn: () => api.extensions.getConfigurations(),
  });

  const { data: auditLogs, isFetched } = useQuery({
    queryKey: ['auditLogs', page, entityTypeFilter, configurationFilter],
    queryFn: () =>
      api.auditLogs.getAuditLogs(
        configurationFilter ? undefined : entityTypeFilter,
        undefined,
        configurationFilter,
        page,
        PAGE_SIZE,
      ),
  });

  // Fetch all logs for the selected entity to find the previous entry
  const { data: entityLogs } = useQuery({
    queryKey: ['auditLogsForEntity', selectedLog?.entityType, selectedLog?.entityId],
    queryFn: () =>
      api.auditLogs.getAuditLogs(selectedLog!.entityType as GetAuditLogsEntityTypeEnum, selectedLog!.entityId, undefined, 0, 100),
    enabled: !!selectedLog && selectedLog.action === 'update',
  });

  // Find the previous log entry for the selected log
  const previousLog = useMemo(() => {
    if (!selectedLog || !entityLogs?.items) return null;

    const allLogs = entityLogs.items;
    const currentIndex = allLogs.findIndex((log) => log.id === selectedLog.id);

    if (currentIndex >= 0 && currentIndex < allLogs.length - 1) {
      return allLogs[currentIndex + 1];
    }

    return null;
  }, [selectedLog, entityLogs]);

  const handleChangePage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handleFilterChange = useCallback((value: string | null) => {
    setEntityTypeFilter(value as GetAuditLogsEntityTypeEnum | undefined);
    setPage(0);
  }, []);

  const handleConfigurationFilterChange = useCallback((value: string | null) => {
    setConfigurationFilter(value ? Number(value) : undefined);
    setPage(0);
  }, []);

  const configurationOptions = useMemo(
    () =>
      configurations?.items.map((config) => ({
        value: String(config.id),
        label: config.name,
      })) ?? [],
    [configurations],
  );

  const filterOptions = [
    { value: '', label: texts.auditLog.allTypes },
    { value: 'configuration', label: texts.auditLog.configuration },
    { value: 'extension', label: texts.auditLog.extension },
    { value: 'bucket', label: texts.auditLog.bucket },
    { value: 'settings', label: texts.auditLog.settings },
    { value: 'userGroup', label: texts.auditLog.userGroup },
    { value: 'user', label: texts.auditLog.user },
  ];

  return (
    <>
      <Page>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-3xl">{texts.auditLog.headline}</h2>

          <div className="flex gap-4">
            <Select
              placeholder={texts.auditLog.filterByAssistant}
              data={configurationOptions}
              value={configurationFilter ? String(configurationFilter) : null}
              onChange={handleConfigurationFilterChange}
              clearable
              searchable
              className="w-64"
            />
            <Select
              placeholder={texts.auditLog.entityType}
              data={filterOptions}
              value={entityTypeFilter || ''}
              onChange={handleFilterChange}
              clearable
              disabled={!!configurationFilter}
              className="w-48"
            />
          </div>
        </div>

        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <table className="table table-fixed text-base">
              <thead>
                <tr>
                  <th className="w-32">{texts.auditLog.entityType}</th>
                  <th className="w-24">{texts.auditLog.entityId}</th>
                  <th>{texts.auditLog.entityName}</th>
                  <th className="w-32">{texts.auditLog.action}</th>
                  <th>{texts.auditLog.user}</th>
                  <th className="w-52">{texts.auditLog.timestamp}</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs?.items.map((log) => (
                  <tr className="cursor-pointer hover:bg-gray-50" key={log.id} onClick={() => setSelectedLog(log)}>
                    <td>
                      <EntityTypeBadge entityType={log.entityType} />
                    </td>
                    <td className="font-mono text-sm text-gray-500" title={log.entityId}>
                      {truncateId(log.entityId)}
                    </td>
                    <td className="truncate overflow-hidden">{getEntityName(log)}</td>
                    <td>
                      <ActionBadge action={log.action} />
                    </td>
                    <td className="truncate overflow-hidden">{log.userName || log.userId}</td>
                    <td>{formatDate(log.createdAt)}</td>
                  </tr>
                ))}

                {auditLogs?.items.length === 0 && isFetched && (
                  <tr>
                    <td colSpan={6}>{texts.auditLog.empty}</td>
                  </tr>
                )}
              </tbody>
            </table>

            <Pagination page={page} pageSize={PAGE_SIZE} total={auditLogs?.total || 0} onPage={handleChangePage} />
          </div>
        </div>
      </Page>

      <DetailsModal auditLog={selectedLog} previousLog={previousLog} onClose={() => setSelectedLog(null)} />
    </>
  );
}
