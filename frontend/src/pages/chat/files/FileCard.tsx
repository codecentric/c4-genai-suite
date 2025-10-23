import { formatDate } from 'date-fns';
import { memo } from 'react';
import { FileDto } from 'src/api';
import { ConfirmDialog, Icon } from 'src/components';
import { OverlayDropdown } from 'src/components/Overlay';
import { cn, formatFileSize } from 'src/lib';
import { extractType } from 'src/pages/utils';
import { texts } from 'src/texts';
import { useFileIdSelector } from './useFileIdSelector';

interface FileCardProps {
  // The uploaded file.
  file: FileDto;

  // Invoked when deleted.
  onDelete: (file: FileDto) => void;

  // state manager for selecting files as user arguments
  fileIdSelector: ReturnType<typeof useFileIdSelector>;
}

export const FileCard = memo((props: FileCardProps) => {
  const { file, onDelete, fileIdSelector } = props;
  const { selectedIDs, toggleIdSelection, deselectId } = fileIdSelector;

  const removeFile = (file: FileDto) => {
    deselectId(file);
    onDelete(file);
  };

  return (
    <div className="card bg-base-100 border-2 shadow-sm hover:shadow">
      <div className="group card-body relative p-4 text-sm">
        <div className="flex justify-between">
          <span className="badge bg-gray-200">{extractType(file)}</span>
          <span className="text-sm">{formatFileSize(file.fileSize)}</span>
        </div>

        <div className="mt-1 flex gap-2 truncate" title={file.fileName}>
          <input
            type="checkbox"
            checked={selectedIDs.includes(file.id)}
            onChange={() => toggleIdSelection(file)}
            aria-label={texts.accessibility.selectFile(file.fileName)}
          />
          {file.fileName}
        </div>
        <span className="text-sm">{formatDate(file.uploadedAt, 'Pp')}</span>

        <OverlayDropdown
          className="invisible absolute top-2 right-2 p-0 group-hover:visible"
          button={({ isOpen }) => (
            <button
              className={cn('btn btn-ghost btn-sm rounded-none bg-gray-100 hover:bg-gray-100', {
                'btn-secondary !visible': isOpen,
              })}
            >
              <Icon size={16} icon="more-horizontal" />
            </button>
          )}
        >
          <ul tabIndex={0} className="dropdown-menu">
            <li>
              <ConfirmDialog
                title={texts.files.removeBucketConfirmTitle}
                text={texts.files.removeFileConfirmText}
                onPerform={() => removeFile(file)}
              >
                {({ onClick }) => <a onClick={onClick}>{texts.common.remove}</a>}
              </ConfirmDialog>
            </li>
          </ul>
        </OverlayDropdown>
      </div>
    </div>
  );
});
