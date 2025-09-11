import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { render } from 'src/pages/admin/test-utils';
import { ReasoningLoadingIndicator, ReasoningLoadingIndicatorProps } from './ReasoningLoadingIndicator';

describe('ReasoningLoadingIndicator', () => {
  const defaultProps: ReasoningLoadingIndicatorProps = {};

  it('renders simple loading indicator by default', () => {
    render(<ReasoningLoadingIndicator {...defaultProps} />);

    expect(screen.getByText('Analyzing your request...')).toBeInTheDocument();
  });

  it('shows current step when provided', () => {
    render(<ReasoningLoadingIndicator currentStep="Understanding the problem" />);

    expect(screen.getByText('Processing: Understanding the problem')).toBeInTheDocument();
  });

  it('shows custom message when provided', () => {
    render(<ReasoningLoadingIndicator message="Custom loading message" />);

    expect(screen.getByText('Custom loading message')).toBeInTheDocument();
  });

  it('renders detailed loading indicator when detailed=true', () => {
    render(<ReasoningLoadingIndicator detailed={true} />);

    expect(screen.getByText('Reasoning in Progress')).toBeInTheDocument();
    expect(screen.getByText('Thinking')).toBeInTheDocument();
  });

  it('shows progress when provided in detailed mode', () => {
    render(<ReasoningLoadingIndicator detailed={true} progress={75} />);

    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('shows current step and progress in detailed mode', () => {
    render(<ReasoningLoadingIndicator detailed={true} currentStep="Analyzing data" progress={50} />);

    expect(screen.getByText('Processing: Analyzing data')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });
});
