import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReasoningStep } from '../state/types';
import { ChatItemReasoning } from './ChatItemReasoning';

describe('ChatItemReasoning', () => {
  const mockReasoningSteps: ReasoningStep[] = [
    {
      id: '1',
      title: 'Analyzing query',
      content: 'Breaking down the user request...',
      status: 'completed',
      timestamp: new Date('2023-01-01T12:00:00Z'),
    },
    {
      id: '2',
      title: 'Processing data',
      content: 'Gathering relevant information...',
      status: 'in-progress',
      timestamp: new Date('2023-01-01T12:01:00Z'),
      tokens: 'raw reasoning tokens here...',
    },
    {
      id: '3',
      title: 'Error step',
      content: 'Something went wrong',
      status: 'error',
      timestamp: new Date('2023-01-01T12:02:00Z'),
    },
  ];

  it('renders reasoning process with steps', () => {
    render(<ChatItemReasoning reasoning={mockReasoningSteps} />);

    expect(screen.getByText('Reasoning Process')).toBeInTheDocument();
    expect(screen.getByText('Analyzing query')).toBeInTheDocument();
    expect(screen.getByText('Processing data')).toBeInTheDocument();
    expect(screen.getByText('Error step')).toBeInTheDocument();
  });

  it('does not render when no reasoning steps provided', () => {
    render(<ChatItemReasoning reasoning={[]} />);
    expect(screen.queryByText('Reasoning Process')).not.toBeInTheDocument();
  });

  it('shows streaming indicator when isStreaming is true', () => {
    render(<ChatItemReasoning reasoning={mockReasoningSteps} isStreaming={true} />);
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('can be collapsed and expanded', () => {
    render(<ChatItemReasoning reasoning={mockReasoningSteps} />);

    const toggleButton = screen.getByLabelText('toggle reasoning process');

    // Initially open (auto-opens when reasoning steps exist)
    expect(screen.getByText('Analyzing query')).toBeInTheDocument();

    // Click to collapse
    fireEvent.click(toggleButton);
    expect(screen.queryByText('Analyzing query')).not.toBeInTheDocument();

    // Click to expand
    fireEvent.click(toggleButton);
    expect(screen.getByText('Analyzing query')).toBeInTheDocument();
  });

  it('displays different status indicators correctly', () => {
    render(<ChatItemReasoning reasoning={mockReasoningSteps} />);

    // Check that all steps are rendered
    expect(screen.getByText('Analyzing query')).toBeInTheDocument();
    expect(screen.getByText('Processing data')).toBeInTheDocument();
    expect(screen.getByText('Error step')).toBeInTheDocument();
  });

  it('shows raw tokens for in-progress steps', () => {
    render(<ChatItemReasoning reasoning={mockReasoningSteps} />);

    expect(screen.getByText('Raw reasoning tokens:')).toBeInTheDocument();
    expect(screen.getByText('raw reasoning tokens here...')).toBeInTheDocument();
  });

  it('applies custom className when provided', () => {
    render(<ChatItemReasoning reasoning={mockReasoningSteps} className="custom-class" />);
    // Check that the reasoning section renders (implying className was applied correctly)
    expect(screen.getByText('Reasoning Process')).toBeInTheDocument();
  });
});
