import { cleanup, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Metric } from 'src/api/generated-eval';
import { texts } from 'src/texts';
import { server } from '../../../../../mock/node';
import { render, required } from '../../../test-utils';
import { EditMetricDialog } from '../dialogs/EditMetricDialog';

const evalApiBaseUrl = `${import.meta.env.VITE_SERVER_URL}/api/eval`;

const mockLlmEndpoints = [
  {
    id: 'endpoint-1',
    name: 'GPT-4',
    type: 'OPENAI',
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
    _configuration: {
      type: 'OPENAI',
      name: 'GPT-4',
      model: 'gpt-4',
      apiKey: 'key',
      supportedFeatures: ['CHAT_MODEL'],
    },
  },
];

const mockSimpleMetric: Metric = {
  id: 'metric-123',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-02'),
  version: 1,
  _configuration: {
    type: 'ANSWER_RELEVANCY',
    name: 'Test Metric',
    threshold: 0.7,
    includeReason: true,
    chatModelId: 'endpoint-1',
    strictMode: false,
    evaluationSteps: [],
    evaluationParams: [],
  },
};

const mockGEvalMetric: Metric = {
  id: 'metric-456',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-02'),
  version: 1,
  _configuration: {
    type: 'G_EVAL',
    name: 'G-Eval Test',
    threshold: 0.8,
    chatModelId: 'endpoint-1',
    strictMode: true,
    evaluationSteps: ['Step 1', 'Step 2'],
    evaluationParams: ['input', 'actual_output'],
    includeReason: false,
  },
};

describe('EditMetricDialog', () => {
  beforeEach(() => {
    // Mock LLM endpoints API
    server.use(
      http.get(`${evalApiBaseUrl}/v1/llm-endpoints`, () => {
        return HttpResponse.json(mockLlmEndpoints);
      }),
    );
  });

  afterEach(() => {
    cleanup();
  });

  it('should render edit dialog with pre-populated values for simple metric', async () => {
    render(<EditMetricDialog metric={mockSimpleMetric} onClose={vi.fn()} />);

    await waitFor(() => {
      const nameInput = screen.getByLabelText(required(texts.evals.metric.nameLabel));
      expect(nameInput).toHaveValue('Test Metric');
    });

    expect(screen.getByText(texts.evals.metric.editTitle)).toBeInTheDocument();
  });

  it('should render edit dialog with pre-populated values for G-Eval metric', async () => {
    render(<EditMetricDialog metric={mockGEvalMetric} onClose={vi.fn()} />);

    await waitFor(() => {
      const nameInput = screen.getByLabelText(required(texts.evals.metric.nameLabel));
      expect(nameInput).toHaveValue('G-Eval Test');
    });

    // Should show G-Eval fields
    expect(screen.getByText(texts.evals.metric.evaluationStepsLabel)).toBeInTheDocument();
  });

  it('should show simple metric fields for simple metric', async () => {
    render(<EditMetricDialog metric={mockSimpleMetric} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(texts.evals.metric.includeReasonLabel)).toBeInTheDocument();
    });

    // Should NOT show G-Eval fields
    expect(screen.queryByText(texts.evals.metric.evaluationStepsLabel)).not.toBeInTheDocument();
  });

  it('should show G-Eval fields for G-Eval metric', async () => {
    render(<EditMetricDialog metric={mockGEvalMetric} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(texts.evals.metric.evaluationStepsLabel)).toBeInTheDocument();
      expect(screen.getByText(texts.evals.metric.evaluationParamsLabel)).toBeInTheDocument();
    });

    // Should NOT show simple metric fields
    expect(screen.queryByText(texts.evals.metric.includeReasonLabel)).not.toBeInTheDocument();
  });

  it('should update metric successfully', async () => {
    const onClose = vi.fn();
    const onUpdated = vi.fn();

    server.use(
      http.patch(`${evalApiBaseUrl}/v1/metrics/:metricId`, () => {
        return HttpResponse.json({
          ...mockSimpleMetric,
          version: 2,
          _configuration: {
            ...mockSimpleMetric._configuration,
            name: 'Updated Name',
          },
        });
      }),
    );

    render(<EditMetricDialog metric={mockSimpleMetric} onClose={onClose} onUpdated={onUpdated} />);

    const user = userEvent.setup();

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByLabelText(required(texts.evals.metric.nameLabel))).toBeInTheDocument();
    });

    // Update the name
    const nameInput = screen.getByLabelText(required(texts.evals.metric.nameLabel));
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Name');

    // Submit
    const saveButton = screen.getByRole('button', { name: texts.common.save });
    await user.click(saveButton);

    await waitFor(() => {
      expect(onUpdated).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('should validate required fields', async () => {
    render(<EditMetricDialog metric={mockSimpleMetric} onClose={vi.fn()} />);

    const user = userEvent.setup();

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByLabelText(required(texts.evals.metric.nameLabel))).toBeInTheDocument();
    });

    // Clear the name
    const nameInput = screen.getByLabelText(required(texts.evals.metric.nameLabel));
    await user.clear(nameInput);

    // Try to submit
    const saveButton = screen.getByRole('button', { name: texts.common.save });
    await user.click(saveButton);

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(texts.evals.metric.nameRequired)).toBeInTheDocument();
    });
  });

  it('should call onClose when cancel is clicked', async () => {
    const onClose = vi.fn();
    render(<EditMetricDialog metric={mockSimpleMetric} onClose={onClose} />);

    const user = userEvent.setup();

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByLabelText(required(texts.evals.metric.nameLabel))).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole('button', { name: texts.common.cancel });
    await user.click(cancelButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('should show loading state while updating', async () => {
    server.use(
      http.patch(`${evalApiBaseUrl}/v1/metrics/:metricId`, async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return HttpResponse.json(mockSimpleMetric);
      }),
    );

    render(<EditMetricDialog metric={mockSimpleMetric} onClose={vi.fn()} />);

    const user = userEvent.setup();

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByLabelText(required(texts.evals.metric.nameLabel))).toBeInTheDocument();
    });

    // Submit
    const saveButton = screen.getByRole('button', { name: texts.common.save });
    await user.click(saveButton);

    // Button should show loading state
    expect(saveButton).toHaveAttribute('data-loading', 'true');
  });
});
