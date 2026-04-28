import { Skeleton } from '@mantine/core';
import { IconPencil, IconTrash } from '@tabler/icons-react';
import type { LLMEndpoint } from 'src/api/generated-eval';
import { texts } from 'src/texts';
import { LlmEndpointFeaturesBadge } from './LlmEndpointFeaturesBadge';
import { LlmEndpointTypeChip } from './LlmEndpointTypeChip';

interface LlmEndpointsTableProps {
  endpoints: LLMEndpoint[];
  isFetching: boolean;
  isFetched: boolean;
  onRowClick: (endpoint: LLMEndpoint) => void;
  onEdit: (endpoint: LLMEndpoint) => void;
  onDelete: (endpoint: LLMEndpoint) => void;
  isDeleting?: boolean;
}

export function LlmEndpointsTable({
  endpoints,
  isFetching,
  isFetched,
  onRowClick,
  onEdit,
  onDelete,
  isDeleting,
}: LlmEndpointsTableProps) {
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
          <th>{texts.evals.llmEndpoint.name}</th>
          <th className="w-40">{texts.evals.llmEndpoint.type}</th>
          <th className="w-48">{texts.evals.llmEndpoint.features}</th>
          <th className="w-36">{texts.evals.llmEndpoint.createdAt}</th>
          <th className="w-36">{texts.evals.llmEndpoint.updatedAt}</th>
          <th className="w-28">{texts.evals.llmEndpoint.actions}</th>
        </tr>
      </thead>
      <tbody>
        {isFetching && !isFetched && (
          <>
            {Array.from({ length: 5 }).map((_, i) => (
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
          endpoints.map((endpoint) => (
            <tr className="cursor-pointer hover:bg-gray-50" key={endpoint.id} onClick={() => onRowClick(endpoint)}>
              <td className="truncate overflow-hidden font-semibold">{endpoint.name}</td>
              <td className="overflow-hidden">
                <LlmEndpointTypeChip type={endpoint._configuration.type} />
              </td>
              <td className="overflow-hidden">
                <LlmEndpointFeaturesBadge features={endpoint.supportedFeatures} />
              </td>
              <td className="overflow-hidden">{formatDate(endpoint.createdAt)}</td>
              <td className="overflow-hidden">{formatDate(endpoint.updatedAt)}</td>
              <td className="overflow-hidden">
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(endpoint);
                    }}
                    disabled={isDeleting}
                  >
                    <IconPencil size={18} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm text-error"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(endpoint);
                    }}
                    disabled={isDeleting}
                  >
                    <IconTrash size={18} />
                  </button>
                </div>
              </td>
            </tr>
          ))}

        {isFetched && endpoints.length === 0 && (
          <tr>
            <td colSpan={6} className="py-8 text-center">
              <div className="text-gray-500">
                <p className="mb-2">{texts.evals.llmEndpoint.empty}</p>
                <p className="text-sm">{texts.evals.llmEndpoint.emptyHint}</p>
              </div>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
