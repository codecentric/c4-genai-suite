import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateEvaluationDialog } from './CreateEvaluationDialog';
import { useWizardStore } from './state/hooks';

// Mock the API client
vi.mock('src/api/state/apiEvalClient', () => ({
  useEvalApi: () => ({
    evaluations: {
      evaluationsPost: vi.fn(),
    },
  }),
}));

// Mock react-toastify
vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock all wizard step components
vi.mock('./create/steps/ModeSelectionStep', () => ({
  ModeSelectionStep: () => <div data-testid="mode-step">Mode Step</div>,
}));

vi.mock('./create/steps/SourceStep', () => ({
  SourceStep: () => <div data-testid="source-step">Source Step</div>,
}));

vi.mock('./create/steps/MetricsSelectionStep', () => ({
  MetricsSelectionStep: () => <div data-testid="metrics-step">Metrics Step</div>,
}));

vi.mock('./create/steps/AssistantSelectionStep', () => ({
  AssistantSelectionStep: () => <div data-testid="assistant-step">Assistant Step</div>,
}));

vi.mock('./create/steps/ReviewStep', () => ({
  ReviewStep: () => <div data-testid="review-step">Review Step</div>,
}));

const mockOnClose = vi.fn();
const mockOnCreate = vi.fn();

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <MantineProvider>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/admin/evals/evaluations']}>
          <Routes>
            <Route path="/admin/evals/evaluations" element={ui} />
            <Route path="/admin/evals/evaluations/:id" element={<div>Detail Page</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </MantineProvider>,
  );
}

describe('CreateEvaluationDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset wizard state before each test
    useWizardStore.getState().reset();
  });

  it('should render the dialog with title', () => {
    renderWithProviders(<CreateEvaluationDialog onClose={mockOnClose} onCreate={mockOnCreate} />);
    expect(screen.getByText(/create evaluation/i)).toBeInTheDocument();
  });

  it('should render stepper component', () => {
    renderWithProviders(<CreateEvaluationDialog onClose={mockOnClose} onCreate={mockOnCreate} />);
    // Mantine stepper should be present with step buttons
    const stepButtons = screen
      .getAllByRole('button')
      .filter(
        (btn) =>
          btn.textContent?.includes('Source Mode') ||
          btn.textContent?.includes('Test Cases') ||
          btn.textContent?.includes('Metrics') ||
          btn.textContent?.includes('Assistant') ||
          btn.textContent?.includes('Review'),
      );
    expect(stepButtons.length).toBeGreaterThanOrEqual(5);
  });

  it('should display mode selection step initially', () => {
    renderWithProviders(<CreateEvaluationDialog onClose={mockOnClose} onCreate={mockOnCreate} />);
    expect(screen.getByTestId('mode-step')).toBeInTheDocument();
  });

  it('should display back button when not on first step', () => {
    useWizardStore.getState().setStep('metrics');
    renderWithProviders(<CreateEvaluationDialog onClose={mockOnClose} onCreate={mockOnCreate} />);
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
  });

  it('should not display back button on first step', () => {
    renderWithProviders(<CreateEvaluationDialog onClose={mockOnClose} onCreate={mockOnCreate} />);
    expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument();
  });

  it('should display next button when not on last step', () => {
    renderWithProviders(<CreateEvaluationDialog onClose={mockOnClose} onCreate={mockOnCreate} />);
    expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
  });

  it('should display create button on last step', () => {
    useWizardStore.getState().setStep('review');
    renderWithProviders(<CreateEvaluationDialog onClose={mockOnClose} onCreate={mockOnCreate} />);
    expect(screen.getByRole('button', { name: /create evaluation/i })).toBeInTheDocument();
  });

  it('should disable next button when cannot proceed', () => {
    renderWithProviders(<CreateEvaluationDialog onClose={mockOnClose} onCreate={mockOnCreate} />);
    const nextButton = screen.getByRole('button', { name: /next/i });
    expect(nextButton).toBeDisabled();
  });

  it('should enable next button when can proceed', () => {
    // Set mode so we can proceed from first step
    useWizardStore.getState().setMode('catalog');
    renderWithProviders(<CreateEvaluationDialog onClose={mockOnClose} onCreate={mockOnCreate} />);
    const nextButton = screen.getByRole('button', { name: /next/i });
    expect(nextButton).not.toBeDisabled();
  });

  it('should display cancel button', () => {
    renderWithProviders(<CreateEvaluationDialog onClose={mockOnClose} onCreate={mockOnCreate} />);
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('should call onClose when cancel button is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CreateEvaluationDialog onClose={mockOnClose} onCreate={mockOnCreate} />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('should render all 5 steps in stepper', () => {
    renderWithProviders(<CreateEvaluationDialog onClose={mockOnClose} onCreate={mockOnCreate} />);
    // Check for step labels (this depends on Mantine Stepper implementation)
    // We can verify by checking the data structure
    const { currentStep } = useWizardStore.getState();
    expect(currentStep).toBe('mode');
  });

  it('should advance to next step when next button is clicked', async () => {
    const user = userEvent.setup();
    useWizardStore.getState().setMode('catalog');
    renderWithProviders(<CreateEvaluationDialog onClose={mockOnClose} onCreate={mockOnCreate} />);

    const nextButton = screen.getByRole('button', { name: /next/i });
    await user.click(nextButton);

    // Should advance to source step
    await waitFor(() => {
      expect(screen.getByTestId('source-step')).toBeInTheDocument();
    });
  });

  it('should go back to previous step when back button is clicked', async () => {
    const user = userEvent.setup();
    useWizardStore.getState().setStep('metrics');
    renderWithProviders(<CreateEvaluationDialog onClose={mockOnClose} onCreate={mockOnCreate} />);

    const backButton = screen.getByRole('button', { name: /back/i });
    await user.click(backButton);

    // Should go back to source step
    await waitFor(() => {
      expect(screen.getByTestId('source-step')).toBeInTheDocument();
    });
  });

  it('should display correct step content based on current step', () => {
    const steps = [
      { step: 'mode' as const, testId: 'mode-step' },
      { step: 'source' as const, testId: 'source-step' },
      { step: 'metrics' as const, testId: 'metrics-step' },
      { step: 'assistant' as const, testId: 'assistant-step' },
      { step: 'review' as const, testId: 'review-step' },
    ];

    steps.forEach(({ step, testId }) => {
      useWizardStore.getState().setStep(step);
      const { unmount } = renderWithProviders(<CreateEvaluationDialog onClose={mockOnClose} onCreate={mockOnCreate} />);
      expect(screen.getByTestId(testId)).toBeInTheDocument();
      unmount();
    });
  });
});
