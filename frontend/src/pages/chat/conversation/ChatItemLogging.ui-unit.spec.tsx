import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { render } from 'src/pages/admin/test-utils';
import { ChatItemLogging, ChatItemLoggingProps } from './ChatItemLogging';

describe('ChatItemLogging', () => {
  const defaultProps: ChatItemLoggingProps = {
    logging: ['*LOGGING* **Test logging message** \n\nMessage1\n\nMessage2\n\nMessage3'],
  };

  const expectVisibleChunks = () => {
    expect(screen.getByText('LOGGING')).toBeInTheDocument();
    expect(screen.getByText('Test logging message')).toBeInTheDocument();
    expect(screen.getByText('Message1')).toBeInTheDocument();
    expect(screen.getByText('Message2')).toBeInTheDocument();
    expect(screen.getByText('Message3')).toBeInTheDocument();
  };

  const expectHiddenChunks = () => {
    expect(screen.queryByText('LOGGING')).not.toBeInTheDocument();
    expect(screen.queryByText('Test logging message')).not.toBeInTheDocument();
    expect(screen.queryByText('Message1')).not.toBeInTheDocument();
    expect(screen.queryByText('Message2')).not.toBeInTheDocument();
    expect(screen.queryByText('Message3')).not.toBeInTheDocument();
  };

  it('should render component with initial hidden chunks', () => {
    render(<ChatItemLogging {...defaultProps} />);
    expect(screen.getByText('Chunks information')).toBeInTheDocument();
    expectHiddenChunks();
  });

  it('should render chunks information', async () => {
    render(<ChatItemLogging {...defaultProps} />);
    const user = userEvent.setup();
    const toggleButton = screen.getByRole('button', { name: 'Toggle chunks information' });

    await user.click(toggleButton);
    expect(screen.getByText('Chunks information')).toBeInTheDocument();
    expectVisibleChunks();
  });

  it('should hide chunks information', async () => {
    render(<ChatItemLogging {...defaultProps} />);
    const user = userEvent.setup();
    const toggleButton = screen.getByRole('button', { name: 'Toggle chunks information' });

    await user.click(toggleButton);
    await user.click(toggleButton);
    expectHiddenChunks();
  });
});
