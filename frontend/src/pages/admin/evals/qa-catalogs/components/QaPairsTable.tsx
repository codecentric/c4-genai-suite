import { Tooltip } from '@mantine/core';
import { IconEdit, IconTrash, IconArrowBackUp } from '@tabler/icons-react';
import type { QAPair } from 'src/api/generated-eval';
import { texts } from 'src/texts';
import type { PendingChange } from '../state';

interface QaPairsTableProps {
  pairs: (QAPair & { _pendingStatus?: 'added' | 'updated' | 'deleted' })[];
  pendingChanges: PendingChange[];
  onEdit: (pair: QAPair) => void;
  onDelete: (pair: QAPair) => void;
  onUndo: (pairId: string) => void;
}

export function QaPairsTable({ pairs, pendingChanges, onEdit, onDelete, onUndo }: QaPairsTableProps) {
  const getRowClass = (pair: QAPair & { _pendingStatus?: string }) => {
    switch (pair._pendingStatus) {
      case 'added':
        return 'bg-green-50 border-l-4 border-green-500';
      case 'updated':
        return 'bg-blue-50 border-l-4 border-blue-500';
      case 'deleted':
        return 'bg-red-50 border-l-4 border-red-500 opacity-60';
      default:
        return 'hover:bg-gray-50';
    }
  };

  const truncate = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  const isPending = (pairId: string) => {
    return pendingChanges.some((c) => {
      if (c.type === 'addition') return c.tempId === pairId;
      return c.id === pairId;
    });
  };

  return (
    <table className="table table-fixed text-base w-full">
      <thead>
        <tr>
          <th className="w-2/5">{texts.evals.qaCatalog.question}</th>
          <th className="w-2/5">{texts.evals.qaCatalog.expectedOutput}</th>
          <th className="w-1/5">{texts.evals.qaCatalog.contexts}</th>
          <th className="w-24">{texts.evals.qaCatalog.actions}</th>
        </tr>
      </thead>
      <tbody>
        {pairs.map((pair) => (
          <tr key={pair.id} className={getRowClass(pair)}>
            <td className="align-top">
              <div className={pair._pendingStatus === 'deleted' ? 'line-through' : ''}>
                <Tooltip label={pair.question} multiline w={400} disabled={pair.question.length <= 100}>
                  <span className="whitespace-pre-wrap break-words">{truncate(pair.question, 100)}</span>
                </Tooltip>
              </div>
            </td>
            <td className="align-top">
              <div className={pair._pendingStatus === 'deleted' ? 'line-through' : ''}>
                <Tooltip label={pair.expectedOutput} multiline w={400} disabled={pair.expectedOutput.length <= 100}>
                  <span className="whitespace-pre-wrap break-words">{truncate(pair.expectedOutput, 100)}</span>
                </Tooltip>
              </div>
            </td>
            <td className="align-top">
              <div className={pair._pendingStatus === 'deleted' ? 'line-through' : ''}>
                {pair.contexts.length > 0 ? (
                  <Tooltip
                    label={pair.contexts.join('\n---\n')}
                    multiline
                    w={400}
                  >
                    <span className="text-sm text-gray-600">
                      {pair.contexts.length} context(s)
                    </span>
                  </Tooltip>
                ) : (
                  <span className="text-sm text-gray-400">-</span>
                )}
              </div>
            </td>
            <td className="align-top">
              <div className="flex gap-1">
                {pair._pendingStatus === 'deleted' ? (
                  <Tooltip label={texts.evals.qaCatalog.undoChange}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm text-warning"
                      onClick={() => onUndo(pair.id)}
                    >
                      <IconArrowBackUp size={18} />
                    </button>
                  </Tooltip>
                ) : (
                  <>
                    <Tooltip label={texts.common.edit}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => onEdit(pair)}
                      >
                        <IconEdit size={18} />
                      </button>
                    </Tooltip>
                    <Tooltip label={texts.common.remove}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm text-error"
                        onClick={() => onDelete(pair)}
                      >
                        <IconTrash size={18} />
                      </button>
                    </Tooltip>
                    {isPending(pair.id) && pair._pendingStatus !== 'added' && (
                      <Tooltip label={texts.evals.qaCatalog.undoChange}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm text-warning"
                          onClick={() => onUndo(pair.id)}
                        >
                          <IconArrowBackUp size={18} />
                        </button>
                      </Tooltip>
                    )}
                  </>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
