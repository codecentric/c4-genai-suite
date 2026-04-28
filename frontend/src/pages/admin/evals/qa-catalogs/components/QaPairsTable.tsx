import { Tooltip } from '@mantine/core';
import { IconArrowBackUp, IconEdit, IconTrash } from '@tabler/icons-react';
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
      case 'updated':
      case 'deleted':
        return ''; // Will apply border to first cell instead
      default:
        return 'hover:bg-gray-50';
    }
  };

  const getBorderClass = (pair: QAPair & { _pendingStatus?: string }) => {
    switch (pair._pendingStatus) {
      case 'added':
        return 'border-l-4 border-green-500';
      case 'updated':
        return 'border-l-4 border-blue-500';
      case 'deleted':
        return 'border-l-4 border-red-500';
      default:
        return '';
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
    <table className="w-full table-fixed text-base">
      <thead>
        <tr className="border-b-2 border-gray-200">
          <th className="w-[35%] px-4 py-4 text-left font-semibold">{texts.evals.qaCatalog.question}</th>
          <th className="w-[35%] px-4 py-4 text-left font-semibold">{texts.evals.qaCatalog.expectedOutput}</th>
          <th className="w-[15%] px-4 py-4 text-left font-semibold">{texts.evals.qaCatalog.contexts}</th>
          <th className="w-[15%] px-4 py-4 text-left font-semibold">{texts.evals.qaCatalog.actions}</th>
        </tr>
      </thead>
      <tbody>
        {pairs.map((pair) => (
          <tr key={pair.id} className={getRowClass(pair)}>
            <td className={`px-4 py-4 align-top ${getBorderClass(pair)}`}>
              <div className={pair._pendingStatus === 'deleted' ? 'text-gray-500 line-through' : ''}>
                <Tooltip label={pair.question} multiline w={400} disabled={pair.question.length <= 100}>
                  <span className="break-words whitespace-pre-wrap">{truncate(pair.question, 100)}</span>
                </Tooltip>
              </div>
            </td>
            <td className="px-4 py-4 align-top">
              <div className={pair._pendingStatus === 'deleted' ? 'text-gray-500 line-through' : ''}>
                <Tooltip label={pair.expectedOutput} multiline w={400} disabled={pair.expectedOutput.length <= 100}>
                  <span className="break-words whitespace-pre-wrap">{truncate(pair.expectedOutput, 100)}</span>
                </Tooltip>
              </div>
            </td>
            <td className="px-4 py-4 align-top">
              <div className={pair._pendingStatus === 'deleted' ? 'text-gray-500 line-through' : ''}>
                {pair.contexts.length > 0 ? (
                  <Tooltip label={pair.contexts.join('\n---\n')} multiline w={400}>
                    <span className="text-sm text-gray-600">{pair.contexts.length} context(s)</span>
                  </Tooltip>
                ) : (
                  <span className="text-sm text-gray-400">-</span>
                )}
              </div>
            </td>
            <td className="px-4 py-4 align-top">
              <div className="flex gap-1">
                {pair._pendingStatus === 'deleted' ? (
                  <Tooltip label={texts.evals.qaCatalog.undoChange}>
                    <button type="button" className="btn btn-ghost btn-sm text-warning" onClick={() => onUndo(pair.id)}>
                      <IconArrowBackUp size={18} />
                    </button>
                  </Tooltip>
                ) : (
                  <>
                    <Tooltip label={texts.common.edit}>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => onEdit(pair)}>
                        <IconEdit size={18} />
                      </button>
                    </Tooltip>
                    <Tooltip label={texts.common.remove}>
                      <button type="button" className="btn btn-ghost btn-sm text-error" onClick={() => onDelete(pair)}>
                        <IconTrash size={18} />
                      </button>
                    </Tooltip>
                    {isPending(pair.id) && (
                      <Tooltip label={texts.evals.qaCatalog.undoChange}>
                        <button type="button" className="btn btn-ghost btn-sm text-warning" onClick={() => onUndo(pair.id)}>
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
