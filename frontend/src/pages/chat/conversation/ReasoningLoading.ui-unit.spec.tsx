import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'src/pages/admin/test-utils';
import { ReasoningLoading, ReasoningLoadingProps } from './ReasoningLoading';

describe('ReasoningLoading', () => {
  const defaultProps: ReasoningLoadingProps = {
    isVisible: true,
  };

  it('renders when visible', () => {
    render(<ReasoningLoading {...defaultProps} />);

    expect(screen.getByText('Reasoning in progress')).toBeInTheDocument();
  });

  it('does not render when not visible', () => {
    render(<ReasoningLoading {...defaultProps} isVisible={false} />);

    expect(screen.queryByText('Reasoning in progress')).not.toBeInTheDocument();
  });

  it('shows current step when provided', () => {
    const currentStep = 'Analyzing user input...';
    render(<ReasoningLoading {...defaultProps} currentStep={currentStep} />);

    expect(screen.getByText(currentStep)).toBeInTheDocument();
  });

  it('shows progress bar with percentage when progress is provided', () => {
    render(<ReasoningLoading {...defaultProps} progress={75} />);

    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('shows estimated time remaining when provided', () => {
    render(<ReasoningLoading {...defaultProps} estimatedTimeRemaining={120} />);

    expect(screen.getByText(/Estimated time remaining: 2m 0s/)).toBeInTheDocument();
  });

  it('formats time correctly for different durations', () => {
    // Test seconds
    const { rerender } = render(<ReasoningLoading {...defaultProps} estimatedTimeRemaining={30} />);
    expect(screen.getByText(/30s/)).toBeInTheDocument();

    // Test minutes
    rerender(<ReasoningLoading {...defaultProps} estimatedTimeRemaining={150} />);
    expect(screen.getByText(/2m 30s/)).toBeInTheDocument();

    // Test hours
    rerender(<ReasoningLoading {...defaultProps} estimatedTimeRemaining={7200} />);
    expect(screen.getByText(/2h 0m/)).toBeInTheDocument();
  });

  it('shows cancel button when onCancel is provided', () => {
    const onCancel = vi.fn();
    render(<ReasoningLoading {...defaultProps} onCancel={onCancel} />);

    const cancelButton = screen.getByLabelText('Cancel reasoning');
    expect(cancelButton).toBeInTheDocument();

    fireEvent.click(cancelButton);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('does not show cancel button when onCancel is not provided', () => {
    render(<ReasoningLoading {...defaultProps} />);

    expect(screen.queryByLabelText('Cancel reasoning')).not.toBeInTheDocument();
  });

  it('shows indeterminate progress bar when progress is undefined', () => {
    render(<ReasoningLoading {...defaultProps} />);

    // Should not show percentage text
    expect(screen.queryByText('Progress')).not.toBeInTheDocument();
    expect(screen.queryByText('%')).not.toBeInTheDocument();
  });

  it('does not show estimated time for short durations', () => {
    render(<ReasoningLoading {...defaultProps} estimatedTimeRemaining={3} />);

    expect(screen.queryByText(/Estimated time remaining/)).not.toBeInTheDocument();
  });
});
