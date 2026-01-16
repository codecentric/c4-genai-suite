import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useApi } from 'src/api';
import { useTypedMutationStates } from 'src/hooks';
import { useConversationBucketAvailabilities } from 'src/hooks/api/extensions';
import { useConversationFiles } from 'src/hooks/api/files';
import { buildError } from 'src/lib';
import { texts } from 'src/texts';
import { filterFilesByFileNameExtensions, matchExtension } from './conversation/chat-input-utils';
import { useStateOfSelectedAssistantId, useStateOfSelectedChatId } from './state/chat';

export const useChatDropzone = () => {
  const api = useApi();
  const assistantId = useStateOfSelectedAssistantId();
  const chatId = useStateOfSelectedChatId();
  const { data: userBucket } = useConversationBucketAvailabilities(assistantId);
  const upload = useMutation({
    mutationKey: ['upload-files-in-chat'],
    mutationFn: async (data: { file: File; extensionId: number }) => {
      const file = data.file;
      return api.files.postUserFile(data.extensionId, chatId, file);
    },
    onError: async (error, uploadedFile) => {
      toast.error(await buildError(`${texts.files.uploadFailed} '${uploadedFile.file.name}'`, error));
    },
    onSettled: () => refetch(),
  });
  const uploadMutations = useTypedMutationStates(upload, ['upload-files-in-chat']);
  const { data: chatFiles = [], refetch, remove } = useConversationFiles(chatId);
  const uploadingFiles = uploadMutations
    .filter((m) => m.status === 'pending')
    .map((m) => m.variables?.file)
    .filter(Boolean)
    .map((f) => f!);

  const getFileSlots = () => {
    return userBucket?.extensions.map((x) => {
      const maxFiles = x.maxFiles ?? Number.MAX_SAFE_INTEGER;

      const extUploadingFiles = filterFilesByFileNameExtensions(uploadingFiles, x.fileNameExtensions);
      const extConversationFiles = filterFilesByFileNameExtensions(chatFiles, x.fileNameExtensions);
      const remainingSlots = maxFiles - (extUploadingFiles.length + extConversationFiles.length);
      return {
        extensionTitle: x.title,
        extensionId: x.extensionId,
        remainingSlots,
        hasNoFileSlotLeft: remainingSlots <= 0,
        fileNameExtensions: x.fileNameExtensions,
        maxFiles: maxFiles,
      };
    });
  };

  const fileSlots = getFileSlots();
  const fullFileSlots = fileSlots?.filter((x) => x.hasNoFileSlotLeft);
  const remainingFileSlots = fileSlots?.filter((x) => !x.hasNoFileSlotLeft);
  const filesThatCanBeUploadedCount =
    fileSlots?.map((x) => Math.max(x.remainingSlots, 0)).reduce((prev, curr) => prev + curr, 0) ?? 0;
  const uploadLimitReached = filesThatCanBeUploadedCount <= 0;
  const multiple = filesThatCanBeUploadedCount > 1;
  const oneOfTheRemainingFileSlotsAcceptsAllFileNameExtensions = remainingFileSlots?.some(
    (slot) => slot.fileNameExtensions.length === 0,
  );
  // if one accepts all the file types, then we should allow all ([]), otherwise we aggregate the allowed file types.
  const allowedFileNameExtensions = oneOfTheRemainingFileSlotsAcceptsAllFileNameExtensions
    ? []
    : (remainingFileSlots?.flatMap((slot) => slot.fileNameExtensions) ?? []);

  const handleUploadFile = (files: File[]) => {
    if (!files.length || uploadLimitReached) return;

    // Track which files have already been assigned to avoid duplicates
    const assignedFiles = new Set<File>();
    const supportedFiles = new Set<File>();

    const extensionFilesToUpload = userBucket?.extensions.map((extension) => {
      // filter for matching file type, if all file types are selected only match if there is no other extension with matching file type
      const filesForExtension = files.filter(
        (file) =>
          !assignedFiles.has(file) && // Only consider files that haven't been assigned yet
          (extension.fileNameExtensions.some((fileNameExtension) => matchExtension(file.name, fileNameExtension)) ||
            (!extension.fileNameExtensions.length &&
              !userBucket?.extensions.find(
                (other) =>
                  other.extensionId !== extension.extensionId &&
                  other.fileNameExtensions.some((fileNameExtension) => matchExtension(file.name, fileNameExtension)),
              ))),
      );

      const maxFiles = extension.maxFiles ?? Number.MAX_SAFE_INTEGER;
      const extUploadingFiles = filterFilesByFileNameExtensions(uploadingFiles, extension.fileNameExtensions);
      const extConversationFiles = filterFilesByFileNameExtensions(chatFiles, extension.fileNameExtensions);
      const remainingSlots = maxFiles - (extUploadingFiles.length + extConversationFiles.length);

      const filesForExtensionToUpload = filesForExtension.slice(0, remainingSlots);

      // Mark these files as assigned respectively supported
      filesForExtensionToUpload.forEach((file) => assignedFiles.add(file));
      filesForExtension.forEach((file) => supportedFiles.add(file));

      return {
        extensionId: extension.extensionId,
        filesToUpload: filesForExtensionToUpload,
        tooManyFiles: filesForExtensionToUpload.length < filesForExtension.length,
      };
    });

    extensionFilesToUpload?.forEach(({ filesToUpload, extensionId }) => {
      filesToUpload.forEach((file) => {
        upload.mutate({
          file,
          extensionId,
        });
      });
    });

    // report if some files could not be uploaded
    const unsupportedFiles = files.filter((file) => !supportedFiles.has(file));
    const unassignedFiles = supportedFiles.difference(assignedFiles);

    // generate an error toast for each rejected file
    unsupportedFiles.forEach((file) => {
      toast.error(`${texts.files.uploadFailed} '${file.name}': ${texts.files.uploadFormatUnsupported}`);
    });
    unassignedFiles.forEach((file) => {
      toast.error(`${texts.files.uploadFailed} '${file.name}': ${texts.files.uploadTooManyFiles}`);
    });
  };

  return {
    handleUploadFile,
    allowedFileNameExtensions,
    uploadLimitReached,
    multiple,
    refetchConversationFiles: refetch,
    upload,
    uploadMutations,
    chatFiles,
    userBucket,
    uploadingFiles,
    fullFileSlots,
    remove,
  };
};
