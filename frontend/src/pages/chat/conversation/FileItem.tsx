import { IconFile, IconRotate2, IconTrash } from '@tabler/icons-react';
import React from 'react';
import { FileDto } from 'src/api';
import { extractType } from 'src/pages/utils';
import { texts } from 'src/texts';

type FileItemProps = {
  file: FileDto | { fileName: string };
  onRemove?: (file: FileDto) => void;
  loading?: boolean;
};

export const FileItemComponent = ({ file, onRemove, loading }: FileItemProps) => {
  const fileName = file.fileName;
  const fileType = 'mimeType' in file ? extractType(file) : undefined;

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onRemove && 'id' in file) {
      onRemove(file);
    }
  };

  return (
    <div
      className="group relative flex w-48 items-center gap-2 overflow-clip rounded-md bg-gray-100 p-2 shadow-sm"
      data-testid="file-chip"
    >
      <div className="flex w-full items-center gap-2" data-testid={loading ? 'file-chip-uploading' : 'file-chip-uploaded'}>
        <div className="relative h-10 w-10 flex-shrink-0 p-1">
          {loading ? <IconRotate2 className="loading h-full w-full" /> : <IconFile className="h-full w-full" />}
          {fileType && (
            <span className="absolute right-0 bottom-0 truncate rounded-md bg-black px-[3px] py-[1px] text-[8px] text-white">
              {fileType}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-grow">
          <div className="flex flex-col">
            <span className="truncate text-sm font-medium">{fileName}</span>
            {loading && (
              <div className="animate-show-after-7s relative h-5">
                <span className="animate-alternate-first absolute top-0 right-0 left-0 truncate text-sm font-medium text-orange-800 italic">
                  {texts.files.waitingMessage1}
                </span>
                <span className="animate-alternate-second absolute top-0 right-0 left-0 truncate text-sm font-medium text-orange-800 italic">
                  {texts.files.waitingMessage2}
                </span>
              </div>
            )}
          </div>
        </div>

        {!loading && onRemove && (
          <div className="absolute top-0 right-0 bottom-0 flex items-center bg-gray-100 p-1 pr-2 opacity-0 transition-all group-hover:opacity-100">
            <button className="text-red-500" onClick={handleRemove}>
              <IconTrash className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
