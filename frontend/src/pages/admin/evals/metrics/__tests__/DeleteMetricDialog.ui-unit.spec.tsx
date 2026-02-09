import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import type { Metric } from 'src/api/generated-eval';
import { texts } from 'src/texts';
import { server } from '../../../../../mock/node';
import { render } from '../../../test-utils';
import { DeleteMetricDialog } from '../dialogs/DeleteMetricDialog';

const mockMetric: Metric = {
  id: 'metric-123',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-02'),
  version: 1,
  _configuration: {
    type: 'ANSWER_RELEVANCY',
    name: 'Test Metric',
    threshold: 0.7,
    includeReason: true,
    chatModelId: 'chat-model-1',
    strictMode: false,
    evaluationSteps: [],
    evaluationParams: [],
  },
};

const evalApiBaseUrl = `${import.meta.env.VITE_SERVER_URL}/api/eval`;

describe('DeleteMetricDialog', () => {
  it('should render confirmation dialog with metric name', () => {
    render(<DeleteMetricDialog metric={mockMetric} onClose={vi.fn()} />);

    expect(screen.getByText(texts.evals.metric.deleteConfirmTitle)).toBeInTheDocument();
    expect(screen.getByText(texts.evals.metric.deleteConfirmText('Test Metric'))).toBeInTheDocument();
  });

  it('should call onClose when cancel button is clicked', async () => {
    const onClose = vi.fn();
    render(<DeleteMetricDialog metric={mockMetric} onClose={onClose} />);

    const user = userEvent.setup();
    const cancelButton = screen.getByRole('button', { name: texts.common.cancel });
    await user.click(cancelButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('should delete metric and call callbacks on successful delete', async () => {
    const onClose = vi.fn();
    const onDeleted = vi.fn();

    server.use(
      http.delete(`${evalApiBaseUrl}/v1/metrics/:metricId`, () => {
        return new HttpResponse(null, { status: 204 });
      }),
    );

    render(<DeleteMetricDialog metric={mockMetric} onClose={onClose} onDeleted={onDeleted} />);

    const user = userEvent.setup();
    const deleteButton = screen.getByRole('button', { name: texts.common.remove });
    await user.click(deleteButton);

    // Wait for the mutation to complete and callbacks to be called
    await waitFor(
      () => {
        expect(onDeleted).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );
  });

  it('should show loading state while deleting', async () => {
    server.use(
      http.delete(`${evalApiBaseUrl}/v1/metrics/:metricId`, async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return HttpResponse.json(null, { status: 204 });
      }),
    );

    render(<DeleteMetricDialog metric={mockMetric} onClose={vi.fn()} />);

    const user = userEvent.setup();
    const deleteButton = screen.getByRole('button', { name: texts.common.remove });
    await user.click(deleteButton);

    // Button should show loading state
    expect(deleteButton).toHaveAttribute('data-loading', 'true');
  });

  it('should not call callbacks on failed delete', async () => {
    const onClose = vi.fn();
    const onDeleted = vi.fn();

    server.use(
      http.delete(`${evalApiBaseUrl}/v1/metrics/:metricId`, () => {
        return HttpResponse.json({ detail: 'Failed to delete' }, { status: 500 });
      }),
    );

    render(<DeleteMetricDialog metric={mockMetric} onClose={onClose} onDeleted={onDeleted} />);

    const user = userEvent.setup();
    const deleteButton = screen.getByRole('button', { name: texts.common.remove });
    await user.click(deleteButton);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(onDeleted).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
