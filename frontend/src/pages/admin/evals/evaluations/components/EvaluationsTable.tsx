import { Skeleton } from '@mantine/core';
import type { GetAllEvaluationResult } from 'src/api/generated-eval';
import { texts } from 'src/texts';
import { EvaluationProgressBar } from './EvaluationProgressBar';
import { EvaluationStatusChip } from './EvaluationStatusChip';

interface EvaluationsTableProps {
  evaluations: GetAllEvaluationResult[];
  isFetching: boolean;
  isFetched: boolean;
  onRowClick: (evaluation: GetAllEvaluationResult) => void;
}

export function EvaluationsTable({ evaluations, isFetching, isFetched, onRowClick }: EvaluationsTableProps) {
  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getMetricsCount = (evaluation: GetAllEvaluationResult) => {
    return evaluation.metricResults?.length || 0;
  };

  return (
    <table className="table table-fixed text-base">
      <thead>
        <tr>
          <th>{texts.evals.evaluations.name}</th>
          <th className="w-48">{texts.evals.evaluations.qaCatalog}</th>
          <th className="w-24">{texts.evals.evaluations.metrics}</th>
          <th className="w-32">{texts.evals.evaluations.status}</th>
          <th className="w-48">{texts.evals.evaluations.progress}</th>
          <th className="w-40">{texts.evals.evaluations.createdAt}</th>
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
          evaluations.map((evaluation) => (
            <tr className="cursor-pointer hover:bg-gray-50" key={evaluation.id} onClick={() => onRowClick(evaluation)}>
              <td className="truncate overflow-hidden font-semibold">{evaluation.name}</td>
              <td className="truncate overflow-hidden">
                {evaluation.catalog ? (
                  <span className="text-sm">{evaluation.catalog.name}</span>
                ) : (
                  <span className="text-xs text-gray-500">{texts.evals.evaluations.manualTestCases}</span>
                )}
              </td>
              <td className="text-center">
                <span className="badge badge-sm">{getMetricsCount(evaluation)}</span>
              </td>
              <td className="overflow-hidden">
                <EvaluationStatusChip status={evaluation.status} />
              </td>
              <td className="overflow-hidden">
                <EvaluationProgressBar progress={evaluation.testCaseProgress} showLabel={false} />
                <div className="mt-1 text-xs text-gray-600">
                  {evaluation.testCaseProgress.done} / {evaluation.testCaseProgress.total}
                </div>
              </td>
              <td className="overflow-hidden text-sm">{formatDate(evaluation.createdAt)}</td>
            </tr>
          ))}

        {isFetched && evaluations.length === 0 && (
          <tr>
            <td colSpan={6} className="py-8 text-center">
              <div className="text-gray-500">
                <p className="mb-2">{texts.evals.evaluations.empty}</p>
                <p className="text-sm">{texts.evals.evaluations.emptyHint}</p>
              </div>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
