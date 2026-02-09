import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { QAPair } from 'src/api/generated-eval';
import { render } from '../../../test-utils';
import { QaPairsTable } from './QaPairsTable';

const mockPair: QAPair = {
  id: 'pair-1',
  question: 'What is the capital of France?',
  expectedOutput: 'Paris',
  contexts: ['France is a country in Europe'],
  metaData: {},
};

const mockAddedPair: QAPair & { _pendingStatus: 'added' } = {
  id: 'temp-123',
  question: 'New question',
  expectedOutput: 'New answer',
  contexts: [],
  metaData: {},
  _pendingStatus: 'added',
};

const mockUpdatedPair: QAPair & { _pendingStatus: 'updated' } = {
  ...mockPair,
  question: 'Updated question',
  _pendingStatus: 'updated',
};

const mockDeletedPair: QAPair & { _pendingStatus: 'deleted' } = {
  ...mockPair,
  _pendingStatus: 'deleted',
};

describe('QaPairsTable', () => {
  it('should render table with qa pairs', () => {
    render(<QaPairsTable pairs={[mockPair]} pendingChanges={[]} onEdit={vi.fn()} onDelete={vi.fn()} onUndo={vi.fn()} />);

    expect(screen.getByText('What is the capital of France?')).toBeInTheDocument();
    expect(screen.getByText('Paris')).toBeInTheDocument();
    expect(screen.getByText('1 context(s)')).toBeInTheDocument();
  });

  it('should render added pair with green left border', () => {
    render(
      <QaPairsTable
        pairs={[mockAddedPair]}
        pendingChanges={[
          {
            type: 'addition',
            tempId: 'temp-123',
            data: {
              question: 'New question',
              expectedOutput: 'New answer',
              contexts: [],
            },
          },
        ]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onUndo={vi.fn()}
      />,
    );

    const firstCell = screen.getByText('New question').closest('td');
    expect(firstCell).toHaveClass('border-l-4');
    expect(firstCell).toHaveClass('border-green-500');
  });

  it('should render updated pair with blue left border', () => {
    render(
      <QaPairsTable
        pairs={[mockUpdatedPair]}
        pendingChanges={[
          {
            type: 'update',
            id: 'pair-1',
            data: mockUpdatedPair,
            original: mockPair,
          },
        ]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onUndo={vi.fn()}
      />,
    );

    const firstCell = screen.getByText('Updated question').closest('td');
    expect(firstCell).toHaveClass('border-l-4');
    expect(firstCell).toHaveClass('border-blue-500');
  });

  it('should render deleted pair with red left border and strikethrough', () => {
    render(
      <QaPairsTable
        pairs={[mockDeletedPair]}
        pendingChanges={[
          {
            type: 'deletion',
            id: 'pair-1',
            original: mockPair,
          },
        ]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onUndo={vi.fn()}
      />,
    );

    const firstCell = screen.getByText('What is the capital of France?').closest('td');
    expect(firstCell).toHaveClass('border-l-4');
    expect(firstCell).toHaveClass('border-red-500');

    // Check for strikethrough on text
    const strikeThroughDiv = firstCell?.querySelector('.line-through');
    expect(strikeThroughDiv).toBeInTheDocument();
  });

  it('should show undo button for pending added items', () => {
    render(
      <QaPairsTable
        pairs={[mockAddedPair]}
        pendingChanges={[
          {
            type: 'addition',
            tempId: 'temp-123',
            data: {
              question: 'New question',
              expectedOutput: 'New answer',
              contexts: [],
            },
          },
        ]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onUndo={vi.fn()}
      />,
    );

    // Check for undo button by button class or icon
    const buttons = screen.getAllByRole('button');
    const undoButton = buttons.find((btn) => btn.className.includes('text-warning'));
    expect(undoButton).toBeInTheDocument();
  });

  it('should show undo button for pending updated items', () => {
    render(
      <QaPairsTable
        pairs={[mockUpdatedPair]}
        pendingChanges={[
          {
            type: 'update',
            id: 'pair-1',
            data: mockUpdatedPair,
            original: mockPair,
          },
        ]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onUndo={vi.fn()}
      />,
    );

    // Check for undo button by button class
    const buttons = screen.getAllByRole('button');
    const undoButton = buttons.find((btn) => btn.className.includes('text-warning'));
    expect(undoButton).toBeInTheDocument();
  });

  it('should show only undo button for deleted items', () => {
    render(
      <QaPairsTable
        pairs={[mockDeletedPair]}
        pendingChanges={[
          {
            type: 'deletion',
            id: 'pair-1',
            original: mockPair,
          },
        ]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onUndo={vi.fn()}
      />,
    );

    const buttons = screen.getAllByRole('button');

    // Should have only 1 button (undo)
    expect(buttons.length).toBe(1);
    expect(buttons[0].className).toContain('text-warning');
  });

  it('should call onEdit when edit button is clicked', async () => {
    const onEdit = vi.fn();
    render(<QaPairsTable pairs={[mockPair]} pendingChanges={[]} onEdit={onEdit} onDelete={vi.fn()} onUndo={vi.fn()} />);

    const user = userEvent.setup();
    const buttons = screen.getAllByRole('button');
    // First button should be edit
    await user.click(buttons[0]);

    expect(onEdit).toHaveBeenCalledWith(mockPair);
  });

  it('should call onDelete when delete button is clicked', async () => {
    const onDelete = vi.fn();
    render(<QaPairsTable pairs={[mockPair]} pendingChanges={[]} onEdit={vi.fn()} onDelete={onDelete} onUndo={vi.fn()} />);

    const user = userEvent.setup();
    const buttons = screen.getAllByRole('button');
    // Second button should be delete
    const deleteButton = buttons.find((btn) => btn.className.includes('text-error'));
    await user.click(deleteButton!);

    expect(onDelete).toHaveBeenCalledWith(mockPair);
  });

  it('should call onUndo when undo button is clicked', async () => {
    const onUndo = vi.fn();
    render(
      <QaPairsTable
        pairs={[mockDeletedPair]}
        pendingChanges={[
          {
            type: 'deletion',
            id: 'pair-1',
            original: mockPair,
          },
        ]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onUndo={onUndo}
      />,
    );

    const user = userEvent.setup();
    const buttons = screen.getAllByRole('button');
    const undoButton = buttons.find((btn) => btn.className.includes('text-warning'));
    await user.click(undoButton!);

    expect(onUndo).toHaveBeenCalledWith('pair-1');
  });

  it('should render normal pairs without border', () => {
    render(<QaPairsTable pairs={[mockPair]} pendingChanges={[]} onEdit={vi.fn()} onDelete={vi.fn()} onUndo={vi.fn()} />);

    const firstCell = screen.getByText('What is the capital of France?').closest('td');
    expect(firstCell).not.toHaveClass('border-l-4');
    expect(firstCell).not.toHaveClass('border-green-500');
    expect(firstCell).not.toHaveClass('border-blue-500');
    expect(firstCell).not.toHaveClass('border-red-500');
  });
});
