import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { render } from 'src/pages/admin/test-utils';
import { ReasoningStep } from '../state/types';
import { ChatItemReasoning, ChatItemReasoningProps } from './ChatItemReasoning';

describe('ChatItemReasoning', () => {
  const mockReasoningSteps: ReasoningStep[] = [
    {
      id: '1',
      title: 'Analyzing the problem',
      content: 'Breaking down the user request into smaller components.',
      timestamp: new Date('2025-09-11T10:00:00Z'),
      status: 'completed',
    },
    {
      id: '2',
      title: 'Searching for relevant information',
      content: 'Looking through available data sources to find relevant context.',
      timestamp: new Date('2025-09-11T10:01:00Z'),
      status: 'in-progress',
    },
    {
      id: '3',
      title: 'Formulating response',
      content: 'Preparing a comprehensive answer based on the analysis.',
      timestamp: new Date('2025-09-11T10:02:00Z'),
      status: 'pending',
    },
  ];

  const defaultProps: ChatItemReasoningProps = {
    reasoning: mockReasoningSteps,
    isStreaming: false,
  };

  it('renders reasoning process with steps', () => {
    render(<ChatItemReasoning {...defaultProps} />);

    expect(screen.getByText('Reasoning Process')).toBeInTheDocument();
    expect(screen.getByText('Analyzing the problem')).toBeInTheDocument();
    expect(screen.getByText('Searching for relevant information')).toBeInTheDocument();
    expect(screen.getByText('Formulating response')).toBeInTheDocument();
  });

  it('does not render when no reasoning steps provided', () => {
    render(<ChatItemReasoning reasoning={[]} />);

    expect(screen.queryByText('Reasoning Process')).not.toBeInTheDocument();
  });

  it('shows streaming indicator when isStreaming is true', () => {
    render(<ChatItemReasoning {...defaultProps} isStreaming={true} />);

    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('can be collapsed and expanded', () => {
    render(<ChatItemReasoning {...defaultProps} />);

    // Initially expanded
    expect(screen.getByText('Analyzing the problem')).toBeInTheDocument();

    // Click collapse button
    const collapseButton = screen.getByLabelText('toggle reasoning process');
    fireEvent.click(collapseButton);

    // Should be collapsed now
    expect(screen.queryByText('Analyzing the problem')).not.toBeInTheDocument();

    // Click expand button
    fireEvent.click(collapseButton);

    // Should be expanded again
    expect(screen.getByText('Analyzing the problem')).toBeInTheDocument();
  });

  it('displays different status indicators correctly', () => {
    const stepsWithDifferentStatuses: ReasoningStep[] = [
      { ...mockReasoningSteps[0], status: 'completed' },
      { ...mockReasoningSteps[1], status: 'in-progress' },
      { ...mockReasoningSteps[2], status: 'pending' },
      {
        id: '4',
        title: 'Error step',
        content: 'This step failed',
        timestamp: new Date(),
        status: 'error',
      },
    ];

    render(<ChatItemReasoning reasoning={stepsWithDifferentStatuses} />);

    // All steps should be rendered
    expect(screen.getByText('Analyzing the problem')).toBeInTheDocument();
    expect(screen.getByText('Searching for relevant information')).toBeInTheDocument();
    expect(screen.getByText('Formulating response')).toBeInTheDocument();
    expect(screen.getByText('Error step')).toBeInTheDocument();
  });
});
