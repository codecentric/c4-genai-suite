import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Metric } from 'src/api/generated-eval';
import { texts } from 'src/texts';
import { render } from '../../../test-utils';
import { MetricsTable } from '../components/MetricsTable';

const mockMetrics: Metric[] = [
  {
    id: 'metric-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    version: 1,
    _configuration: {
      type: 'ANSWER_RELEVANCY',
      name: 'Test Metric 1',
      threshold: 0.7,
      includeReason: true,
      chatModelId: 'chat-1',
      strictMode: false,
      evaluationSteps: [],
      evaluationParams: [],
    },
  },
  {
    id: 'metric-2',
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-04'),
    version: 1,
    _configuration: {
      type: 'G_EVAL',
      name: 'Test Metric 2',
      threshold: 0.8,
      chatModelId: 'chat-2',
      strictMode: true,
      evaluationSteps: ['Step 1'],
      evaluationParams: ['input'],
      includeReason: false,
    },
  },
];

describe('MetricsTable', () => {
  it('should render loading skeleton when isFetching is true', () => {
    render(
      <MetricsTable
        metrics={[]}
        isFetching={true}
        isFetched={false}
        onRowClick={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        isDeleting=""
      />,
    );

    // Should show multiple skeleton rows
    const skeletons = document.querySelectorAll('.mantine-Skeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should render empty state when no metrics and isFetched is true', () => {
    render(
      <MetricsTable
        metrics={[]}
        isFetching={false}
        isFetched={true}
        onRowClick={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        isDeleting=""
      />,
    );

    expect(screen.getByText(texts.evals.metric.empty)).toBeInTheDocument();
    expect(screen.getByText(texts.evals.metric.emptyHint)).toBeInTheDocument();
  });

  it('should render table with metrics', () => {
    render(
      <MetricsTable
        metrics={mockMetrics}
        isFetching={false}
        isFetched={true}
        onRowClick={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        isDeleting=""
      />,
    );

    // Should show metric names
    expect(screen.getByText('Test Metric 1')).toBeInTheDocument();
    expect(screen.getByText('Test Metric 2')).toBeInTheDocument();

    // Should show metric types
    expect(screen.getByText(texts.evals.metric.typeAnswerRelevancy)).toBeInTheDocument();
    expect(screen.getByText(texts.evals.metric.typeGEval)).toBeInTheDocument();

    // Should show thresholds
    expect(screen.getByText('0.70')).toBeInTheDocument();
    expect(screen.getByText('0.80')).toBeInTheDocument();
  });

  it('should call onRowClick when row is clicked', async () => {
    const onRowClick = vi.fn();
    render(
      <MetricsTable
        metrics={mockMetrics}
        isFetching={false}
        isFetched={true}
        onRowClick={onRowClick}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        isDeleting=""
      />,
    );

    const user = userEvent.setup();
    const row = screen.getByText('Test Metric 1').closest('tr');
    await user.click(row!);

    expect(onRowClick).toHaveBeenCalledWith(mockMetrics[0]);
  });

  it('should call onEdit when edit button is clicked', async () => {
    const onEdit = vi.fn();
    render(
      <MetricsTable
        metrics={mockMetrics}
        isFetching={false}
        isFetched={true}
        onRowClick={vi.fn()}
        onEdit={onEdit}
        onDelete={vi.fn()}
        isDeleting=""
      />,
    );

    const user = userEvent.setup();
    const editButtons = screen.getAllByLabelText(texts.common.edit);
    await user.click(editButtons[0]);

    expect(onEdit).toHaveBeenCalledWith(mockMetrics[0]);
  });

  it('should call onDelete when delete button is clicked', async () => {
    const onDelete = vi.fn();
    render(
      <MetricsTable
        metrics={mockMetrics}
        isFetching={false}
        isFetched={true}
        onRowClick={vi.fn()}
        onEdit={vi.fn()}
        onDelete={onDelete}
        isDeleting=""
      />,
    );

    const user = userEvent.setup();
    const deleteButtons = screen.getAllByLabelText(texts.common.remove);
    await user.click(deleteButtons[0]);

    expect(onDelete).toHaveBeenCalledWith(mockMetrics[0]);
  });

  it('should not call onRowClick when action button is clicked', async () => {
    const onRowClick = vi.fn();
    const onEdit = vi.fn();
    render(
      <MetricsTable
        metrics={mockMetrics}
        isFetching={false}
        isFetched={true}
        onRowClick={onRowClick}
        onEdit={onEdit}
        onDelete={vi.fn()}
        isDeleting=""
      />,
    );

    const user = userEvent.setup();
    const editButtons = screen.getAllByLabelText(texts.common.edit);
    await user.click(editButtons[0]);

    // onEdit should be called but NOT onRowClick
    expect(onEdit).toHaveBeenCalled();
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('should disable delete button for metric being deleted', () => {
    render(
      <MetricsTable
        metrics={mockMetrics}
        isFetching={false}
        isFetched={true}
        onRowClick={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        isDeleting="metric-1"
      />,
    );

    const deleteButtons = screen.getAllByLabelText(texts.common.remove);
    expect(deleteButtons[0]).toBeDisabled();
    expect(deleteButtons[1]).not.toBeDisabled();
  });

  it('should render table headers correctly', () => {
    render(
      <MetricsTable
        metrics={mockMetrics}
        isFetching={false}
        isFetched={true}
        onRowClick={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        isDeleting=""
      />,
    );

    expect(screen.getByText(texts.evals.metric.name)).toBeInTheDocument();
    expect(screen.getByText(texts.evals.metric.type)).toBeInTheDocument();
    expect(screen.getByText(texts.evals.metric.threshold)).toBeInTheDocument();
    expect(screen.getByText(texts.evals.metric.chatModel)).toBeInTheDocument();
    expect(screen.getByText(texts.evals.metric.createdAt)).toBeInTheDocument();
    expect(screen.getByText(texts.evals.metric.actions)).toBeInTheDocument();
  });
});
