import { Button, Card, Group, Text } from '@mantine/core';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';
import { type ExtensionBucketSettingsDto, FileDto, useApi } from 'src/api';
import { Pagination } from 'src/components';
import { useTypedMutationStates } from 'src/hooks';
import { useConversationBucketAvailabilities } from 'src/hooks/api/extensions';
import { buildError } from 'src/lib';
import { texts } from 'src/texts';
import { FileCard } from './FileCard';
import { useFileIdSelector } from './useFileIdSelector';

type FileProps = {
  conversationId: number;
  configurationId: number;
  userBucket: ExtensionBucketSettingsDto;
};

const pageSize = 20;
export function Files({ conversationId, userBucket, configurationId }: FileProps) {
  const api = useApi();

  const allowedFileNameExtensions = userBucket.fileNameExtensions ?? [];
  const fileIdSelector = useFileIdSelector(conversationId);

  const [page, setPage] = useState(0);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    // useFsAccessApi is false to allow the playwright tests to test file uploads
    // see: https://github.com/react-dropzone/react-dropzone?tab=readme-ov-file#file-dialog-cancel-callback
    useFsAccessApi: false,
    onDrop: (files) => files.forEach((file) => upload.mutate(file)),
  });

  const { data: loadedFiles, refetch: refetchFiles } = useQuery({
    queryKey: ['user-files', page, pageSize],
    queryFn: () => api.files.getUserFiles(page, pageSize),
    refetchInterval: (query) => (query.state.data?.items.some((file) => file.uploadStatus === 'inProgress') ? 1000 : false),
  });
  const { data: conversationBucket } = useConversationBucketAvailabilities(configurationId);
  const upload = useMutation({
    mutationKey: ['upload-user-file'],
    mutationFn: (file: File) => api.files.postUserFile(userBucket.extensionId, undefined, file),
    onSuccess: (file) => fileIdSelector.selectId(file),
    onError: async (error, file) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        return toast.error(await buildError(`${texts.files.uploadFailed} '${file.name}'`, error));
      }
      const isImagesInConversationActive = conversationBucket?.extensions.some(
        (extension) => extension.title === 'Bilder im Chat' || extension.title === 'Files Vision',
      );
      if (isImagesInConversationActive) {
        toast.error(texts.files.uploadImageFailedUseThePaperclip(file.name));
      } else {
        toast.error(texts.files.uploadImageFailedNotYetSupported(file.name));
      }
    },
    onSettled: () => refetchFiles(),
  });
  const deleteFile = useMutation({
    mutationKey: ['delete-user-file'],
    mutationFn: (file: FileDto) => api.files.deleteUserFile(file.id),
    onError: async (error) => toast.error(await buildError(texts.files.removeFileFailed, error)),
    onSettled: () => refetchFiles(),
  });
  const uploadMutations = useTypedMutationStates(upload, ['upload-user-file']);
  const deleteMutations = useTypedMutationStates(deleteFile, ['delete-user-file']);

  const fileToFileDto = (f: File, i: number): FileDto => {
    // transient, only during upload
    // we assign arbitrary ids which do not conflict with the actual ids from the backend
    return {
      id: -i,
      fileName: f.name,
      fileSize: f.size,
      mimeType: f.type,
      uploadedAt: new Date(),
      uploadStatus: 'inProgress',
    };
  };

  const filesInUploadState = [
    ...(loadedFiles?.items.filter((f) => f.uploadStatus === 'inProgress') ?? []),
    ...uploadMutations
      .filter((mutation) => mutation.status === 'pending')
      .map((mutation, i) => fileToFileDto(mutation.variables!, i))
      // there is an edge case where we start with an "inProgress" file and poll the backend
      // if we upload a second file at the same time, it will appear twice. Once from the mutation
      // and once from polling. Since we doe not have a unique identifier for both, we work
      // around this problem by treating the name as a unique identifier.
      // This may lead to only one "uploading" widget when uploading the same file again after reloading.
      .filter((f) => !loadedFiles?.items.some((item) => item.fileName === f.fileName)),
  ];

  const filesInDeleteState = [
    ...deleteMutations.filter((mutation) => mutation.status === 'pending').map((mutation) => mutation.variables!),
  ];
  const filesInReadyState = loadedFiles?.items
    .filter((f) => !filesInUploadState.some((fileInUpload) => fileInUpload.id === f.id))
    .filter((f) => !filesInDeleteState.some((fileInDelete) => fileInDelete.id === f.id));

  const total = filesInReadyState?.length ?? 0;

  return (
    <Card withBorder mt="sm" mr="xs" ml="6">
      <Card.Section withBorder inheritPadding py="xs">
        <Group justify="space-between">
          <Text fw={500}>{texts.files.headlineSearchable}</Text>
        </Group>
      </Card.Section>
      <div className="my-4 flex flex-col gap-4">
        <div
          className="flex min-h-24 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-4 text-center text-sm text-gray-600 transition-all hover:border-gray-400"
          {...getRootProps()}
        >
          <input
            {...getInputProps()}
            accept={allowedFileNameExtensions.length > 0 ? allowedFileNameExtensions.join(', ') : undefined}
          />
          {isDragActive ? <p>{texts.common.dropZoneDrop}</p> : <p>{texts.common.dropZone}</p>}
        </div>

        <Pagination page={page} pageSize={pageSize} total={total} onPage={setPage} />
      </div>
      {loadedFiles && loadedFiles.items?.length > 0 ? (
        <div className="flex justify-between gap-2 pb-2">
          <Button
            size="compact-sm"
            type="button"
            color="gray"
            disabled={fileIdSelector.selectedIDs.length === loadedFiles.items.length}
            onClick={() => {
              loadedFiles.items.forEach((file) => !fileIdSelector.selectedIDs.includes(file.id) && fileIdSelector.selectId(file));
            }}
          >
            {texts.files.selectAll}
          </Button>
          <Button
            size="compact-sm"
            type="button"
            variant="subtle"
            color="gray"
            disabled={fileIdSelector.selectedIDs.length === 0}
            onClick={() =>
              loadedFiles.items.forEach((file) => fileIdSelector.selectedIDs.includes(file.id) && fileIdSelector.deselectId(file))
            }
          >
            {texts.files.deselectAll}
          </Button>
        </div>
      ) : null}
      <div className="flex flex-col overflow-auto">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-2">
            {filesInUploadState.map((fileDto) => (
              <div
                key={`upload-${fileDto.id}`}
                className="rounded-box flex h-20 flex-col items-center justify-center gap-2 bg-gray-200 text-sm text-gray-500"
              >
                {texts.files.uploading}

                <div>{fileDto.fileName}</div>
              </div>
            ))}
            {filesInDeleteState.map((fileDto) => (
              <div
                key={`delete-${fileDto.id}`}
                className="rounded-box flex h-20 flex-col items-center justify-center gap-2 bg-gray-200 text-sm text-gray-500"
              >
                {texts.files.deleting}

                <div>{fileDto.fileName}</div>
              </div>
            ))}

            {filesInReadyState?.map((file) => (
              <FileCard key={file.id} file={file} onDelete={deleteFile.mutate} fileIdSelector={fileIdSelector} />
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
