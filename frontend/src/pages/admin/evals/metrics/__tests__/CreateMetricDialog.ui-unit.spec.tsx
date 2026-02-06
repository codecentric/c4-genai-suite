import { cleanup, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { texts } from 'src/texts';
import { server } from '../../../../../mock/node';
import { render, required } from '../../../test-utils';
import { CreateMetricDialog } from '../dialogs/CreateMetricDialog';

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
  {
    id: 'endpoint-2',
    name: 'Claude',
    type: 'C4',
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
    _configuration: {
      type: 'C4',
      name: 'Claude',
      baseUrl: 'https://api.anthropic.com',
      supportedFeatures: ['CHAT_MODEL'],
    },
  },
];

describe('CreateMetricDialog', () => {
  beforeEach(() => {
    // Mock LLM endpoints API
    server.use(
      http.get(`${evalApiBaseUrl}/v1/llm-endpoints`, () => {
        return HttpResponse.json(mockLlmEndpoints);
      })
    );
  });

  afterEach(() => {
    cleanup();
  });

  it('should render step 1: metric type selection', () => {
    render(<CreateMetricDialog onClose={vi.fn()} />);

    expect(screen.getByText(texts.evals.metric.createTitle)).toBeInTheDocument();
    expect(screen.getByText(texts.evals.metric.typeAnswerRelevancy)).toBeInTheDocument();
    expect(screen.getByText(texts.evals.metric.typeFaithfulness)).toBeInTheDocument();
    expect(screen.getByText(texts.evals.metric.typeHallucination)).toBeInTheDocument();
    expect(screen.getByText(texts.evals.metric.typeGEval)).toBeInTheDocument();
  });

  it('should navigate to step 2 when next is clicked', async () => {
    render(<CreateMetricDialog onClose={vi.fn()} />);

    const user = userEvent.setup();
    const nextButton = screen.getByRole('button', { name: texts.common.next });
    await user.click(nextButton);

    // Should show configuration step
    expect(screen.getByLabelText(required(texts.evals.metric.nameLabel))).toBeInTheDocument();
    expect(screen.getByText(texts.evals.metric.thresholdLabel)).toBeInTheDocument();
  });

  it('should navigate back to step 1 when back is clicked', async () => {
    render(<CreateMetricDialog onClose={vi.fn()} />);

    const user = userEvent.setup();

    // Go to step 2
    const nextButton = screen.getByRole('button', { name: texts.common.next });
    await user.click(nextButton);

    // Go back to step 1
    const backButton = screen.getByRole('button', { name: texts.common.back });
    await user.click(backButton);

    // Should show type selection again
    expect(screen.getByText(texts.evals.metric.typeAnswerRelevancy)).toBeInTheDocument();
  });

  it('should validate required fields on submit', async () => {
    render(<CreateMetricDialog onClose={vi.fn()} />);

    const user = userEvent.setup();

    // Go to step 2
    const nextButton = screen.getByRole('button', { name: texts.common.next });
    await user.click(nextButton);

    // Try to submit without filling fields
    const createButton = screen.getByRole('button', { name: texts.evals.metric.create });
    await user.click(createButton);

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText(texts.evals.metric.nameRequired)).toBeInTheDocument();
      expect(screen.getByText(texts.evals.metric.chatModelRequired)).toBeInTheDocument();
    });
  });

  it('should show G-Eval specific fields when G-Eval is selected', async () => {
    render(<CreateMetricDialog onClose={vi.fn()} />);

    const user = userEvent.setup();

    // Find the dialog
    const dialog = screen.getByRole('dialog');

    // Select G-Eval - find radio by its text content
    const gEvalRadio = within(dialog).getByRole('radio', { name: new RegExp(texts.evals.metric.typeGEval) });
    await user.click(gEvalRadio);

    // Go to step 2
    const nextButton = within(dialog).getByRole('button', { name: texts.common.next });
    await user.click(nextButton);

    // Wait for configuration step to be visible
    await waitFor(() => {
      expect(within(dialog).getByText(texts.evals.metric.evaluationStepsLabel)).toBeInTheDocument();
    });

    // Should show G-Eval specific fields
    expect(within(dialog).getByText(texts.evals.metric.evaluationParamsLabel)).toBeInTheDocument();

    // Should NOT show simple metric fields
    expect(within(dialog).queryByText(texts.evals.metric.includeReasonLabel)).not.toBeInTheDocument();
  });

  it('should show simple metric fields when simple metric is selected', async () => {
    render(<CreateMetricDialog onClose={vi.fn()} />);

    const user = userEvent.setup();

    // Answer Relevancy is selected by default
    const nextButton = screen.getByRole('button', { name: texts.common.next });
    await user.click(nextButton);

    // Should show simple metric fields
    expect(screen.getByText(texts.evals.metric.includeReasonLabel)).toBeInTheDocument();

    // Should NOT show G-Eval fields
    expect(screen.queryByText(texts.evals.metric.evaluationStepsLabel)).not.toBeInTheDocument();
    expect(screen.queryByText(texts.evals.metric.evaluationParamsLabel)).not.toBeInTheDocument();
  });

  it('should call onClose when cancel is clicked', async () => {
    const onClose = vi.fn();
    render(<CreateMetricDialog onClose={onClose} />);

    const user = userEvent.setup();
    const cancelButton = screen.getByRole('button', { name: texts.common.cancel });
    await user.click(cancelButton);

    expect(onClose).toHaveBeenCalled();
  });
});
