import { Skeleton } from '@mantine/core';
import { IconPencil, IconTrash } from '@tabler/icons-react';
import type { Metric } from 'src/api/generated-eval';
import { texts } from 'src/texts';
import { MetricTypeChip } from './MetricTypeChip';

interface MetricsTableProps {
  metrics: Metric[];
  isFetching: boolean;
  isFetched: boolean;
  onRowClick: (metric: Metric) => void;
  onEdit: (metric: Metric) => void;
  onDelete: (metric: Metric) => void;
  isDeleting?: string; // ID of the metric being deleted
}

export function MetricsTable({
  metrics,
  isFetching,
  isFetched,
  onRowClick,
  onEdit,
  onDelete,
  isDeleting,
}: MetricsTableProps) {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <table className="table table-fixed text-base">
      <thead>
        <tr>
          <th>{texts.evals.metric.name}</th>
          <th className="w-48">{texts.evals.metric.type}</th>
          <th className="w-32">{texts.evals.metric.threshold}</th>
          <th className="w-48">{texts.evals.metric.chatModel}</th>
          <th className="w-36">{texts.evals.metric.createdAt}</th>
          <th className="w-28">{texts.evals.metric.actions}</th>
        </tr>
      </thead>
      <tbody>
        {isFetching && !isFetched && (
          <>
            {[...Array(5)].map((_, i) => (
              <tr key={i}>
                <td>
                  <Skeleton height={20} />
                </td>
                <td>
                  <Skeleton height={20} />
                </td>
                <td>
                  <Skeleton height={20} />
                </td>
                <td>
                  <Skeleton height={20} />
                </td>
                <td>
                  <Skeleton height={20} />
                </td>
                <td>
                  <Skeleton height={20} />
                </td>
              </tr>
            ))}
          </>
        )}

        {isFetched &&
          metrics.map((metric) => (
            <tr className="cursor-pointer hover:bg-gray-50" key={metric.id} onClick={() => onRowClick(metric)}>
              <td className="truncate overflow-hidden font-semibold">{metric._configuration.name}</td>
              <td className="overflow-hidden">
                <MetricTypeChip type={metric._configuration.type} />
              </td>
              <td className="overflow-hidden">{metric._configuration.threshold.toFixed(2)}</td>
              <td className="truncate overflow-hidden text-sm">{metric._configuration.chatModelId}</td>
              <td className="overflow-hidden">{formatDate(metric.createdAt)}</td>
              <td className="overflow-hidden">
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(metric);
                    }}
                    disabled={isDeleting === metric.id}
                    aria-label={texts.common.edit}
                  >
                    <IconPencil size={18} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm text-error"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(metric);
                    }}
                    disabled={isDeleting === metric.id}
                    aria-label={texts.common.remove}
                  >
                    <IconTrash size={18} />
                  </button>
                </div>
              </td>
            </tr>
          ))}

        {isFetched && metrics.length === 0 && (
          <tr>
            <td colSpan={6} className="py-8 text-center">
              <div className="text-gray-500">
                <p className="mb-2">{texts.evals.metric.empty}</p>
                <p className="text-sm">{texts.evals.metric.emptyHint}</p>
              </div>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
