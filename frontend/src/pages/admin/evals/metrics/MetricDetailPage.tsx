import { Button, Skeleton } from '@mantine/core';
import { IconArrowLeft, IconPencil, IconTrash } from '@tabler/icons-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Page } from 'src/components';
import { useEventCallback } from 'src/hooks';
import { texts } from 'src/texts';
import { MetricTypeChip } from './components/MetricTypeChip';
import { DeleteMetricDialog } from './dialogs/DeleteMetricDialog';
import { EditMetricDialog } from './dialogs/EditMetricDialog';
import { useMetric } from './hooks/useMetricQueries';

export function MetricDetailPage() {
  const { metricId } = useParams<{ metricId: string }>();
  const navigate = useNavigate();

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: metric, isLoading, refetch } = useMetric(metricId);

  const handleBack = useEventCallback(() => {
    void navigate('/admin/evals/metrics');
  });

  const handleEdit = useEventCallback(() => {
    setShowEditDialog(true);
  });

  const handleCloseEditDialog = useEventCallback(() => {
    setShowEditDialog(false);
  });

  const handleUpdated = useEventCallback(() => {
    void refetch();
  });

  const handleDelete = useEventCallback(() => {
    setShowDeleteDialog(true);
  });

  const handleCloseDeleteDialog = useEventCallback(() => {
    setShowDeleteDialog(false);
  });

  const handleDeleted = useEventCallback(() => {
    void navigate('/admin/evals/metrics');
  });

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading || !metric) {
    return (
      <Page>
        <div className="mb-4">
          <Button variant="subtle" leftSection={<IconArrowLeft />} onClick={handleBack}>
            {texts.evals.metrics}
          </Button>
        </div>
        <Skeleton height={40} className="mb-4" />
        <Skeleton height={200} className="mb-4" />
        <Skeleton height={200} />
      </Page>
    );
  }

  const config = metric._configuration;
  const isGEval = config.type === 'G_EVAL';
  const isSimpleMetric = config.type === 'ANSWER_RELEVANCY' || config.type === 'FAITHFULNESS' || config.type === 'HALLUCINATION';

  return (
    <>
      <Page>
        {/* Breadcrumb */}
        <div className="mb-4">
          <Button variant="subtle" leftSection={<IconArrowLeft />} onClick={handleBack}>
            {texts.evals.metrics}
          </Button>
        </div>

        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-3xl">{config.name}</h2>
            <MetricTypeChip type={config.type} />
          </div>

          <div className="flex gap-2">
            <Button variant="light" leftSection={<IconPencil />} onClick={handleEdit}>
              {texts.common.edit}
            </Button>
            <Button variant="light" color="red" leftSection={<IconTrash />} onClick={handleDelete}>
              {texts.common.remove}
            </Button>
          </div>
        </div>

        {/* Overview Section */}
        <div className="card bg-base-100 mb-4 shadow">
          <div className="card-body">
            <h3 className="mb-4 text-xl font-semibold">{texts.evals.metric.overview}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">{texts.evals.metric.type}</p>
                <div className="font-medium">
                  <MetricTypeChip type={config.type} />
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">{texts.evals.metric.createdAt}</p>
                <p className="font-medium">{formatDate(metric.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">{texts.evals.metric.updatedAt}</p>
                <p className="font-medium">{formatDate(metric.updatedAt)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Configuration Section */}
        <div className="card bg-base-100 mb-4 shadow">
          <div className="card-body">
            <h3 className="mb-4 text-xl font-semibold">{texts.evals.metric.configuration}</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">{texts.evals.metric.nameLabel}</p>
                <p className="font-medium">{config.name}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">{texts.evals.metric.thresholdLabel}</p>
                <p className="font-medium">{config.threshold.toFixed(2)}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">{texts.evals.metric.chatModelLabel}</p>
                <p className="font-medium">{config.chatModelId}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">{texts.evals.metric.strictModeLabel}</p>
                <p className="font-medium">{config.strictMode ? texts.common.yes : texts.common.no}</p>
              </div>

              {isSimpleMetric && (
                <div>
                  <p className="text-sm text-gray-500">{texts.evals.metric.includeReasonLabel}</p>
                  <p className="font-medium">{config.includeReason ? texts.common.yes : texts.common.no}</p>
                </div>
              )}

              {isGEval && (
                <>
                  <div>
                    <p className="text-sm text-gray-500">{texts.evals.metric.evaluationStepsLabel}</p>
                    <ol className="mt-1 list-inside list-decimal space-y-1">
                      {config.evaluationSteps.map((step: string, index: number) => (
                        <li key={index} className="font-medium">
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">{texts.evals.metric.evaluationParamsLabel}</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {config.evaluationParams.map((param: string) => (
                        <span key={param} className="badge badge-outline">
                          {param}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Usage Section (placeholder) */}
        <div className="card bg-base-100 shadow">
          <div className="card-body">
            <h3 className="mb-4 text-xl font-semibold">{texts.evals.metric.usage}</h3>
            <p className="py-8 text-center text-gray-500">{texts.evals.metric.noEvaluationsUsing}</p>
          </div>
        </div>
      </Page>

      {showEditDialog && metric && <EditMetricDialog metric={metric} onClose={handleCloseEditDialog} onUpdated={handleUpdated} />}

      {showDeleteDialog && metric && (
        <DeleteMetricDialog metric={metric} onClose={handleCloseDeleteDialog} onDeleted={handleDeleted} />
      )}
    </>
  );
}
