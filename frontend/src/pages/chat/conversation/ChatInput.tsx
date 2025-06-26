import { ActionIcon, Button, Portal } from '@mantine/core';
import { IconFilter, IconPaperclip } from '@tabler/icons-react';
import { useMutation } from '@tanstack/react-query';
import React, { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { toast } from 'react-toastify';
import { ConfigurationDto, FileDto, useApi } from 'src/api';
import { Icon, Markdown } from 'src/components';
import { ExtensionContext, JSONObject, useEventCallback, useExtensionContext, useTheme } from 'src/hooks';
import { buildError } from 'src/lib';
import { FileItem } from 'src/pages/chat/conversation/FileItem';
import { FilterModal } from 'src/pages/chat/conversation/FilterModal';
import { texts } from 'src/texts';
import { useChatDropzone } from '../useChatDropzone';
import { Suggestions } from './Suggestions';
import {
  getDefault,
  isExtensionWithUserArgs,
  UserArgumentDefaultValueByExtensionIDAndName,
  valueIsDefined,
  valueToString,
} from './chat-input-utils';

interface ChatInputProps {
  configuration?: ConfigurationDto;
  conversationId: number;
  isDisabled?: boolean;
  isEmpty?: boolean;
  onSubmit: (input: string, files?: FileDto[]) => void;
}
export function ChatInput({ conversationId, configuration, isDisabled, isEmpty, onSubmit }: ChatInputProps) {
  const api = useApi();
  const extensionsWithFilter = configuration?.extensions?.filter(isExtensionWithUserArgs) ?? [];
  const { updateContext, context } = useExtensionContext(conversationId);
  const [defaultValues, setDefaultValues] = useState<UserArgumentDefaultValueByExtensionIDAndName>({});
  const {
    uploadingFiles,
    fullFileSlots,
    allowedFileNameExtensions,
    conversationFiles,
    handleUploadFile,
    multiple,
    uploadLimitReached,
    refetchConversationFiles,
    uploadMutations,
    upload,
    userBucket,
  } = useChatDropzone(configuration?.id, conversationId);

  useEffect(() => {
    const defaultValues = configuration?.extensions?.filter(isExtensionWithUserArgs).reduce(
      (prev, extension) => {
        prev[extension.id] = {};
        Object.keys(extension.userArguments).forEach((name) => {
          prev[extension.id][name] = getDefault(extension.userArguments[name]);
        });

        return prev;
      },
      {} as Record<string, JSONObject>,
    );

    setDefaultValues(defaultValues ?? {});
  }, [configuration?.extensions]);

  const textarea = useRef<HTMLTextAreaElement>(null);
  const { theme } = useTheme();
  const [input, setInput] = useState('');
  const [showFilter, setShowFilter] = useState(false);

  useEffect(() => {
    textarea.current?.focus();
  }, [conversationId]);

  const contextWithDefaults = context ?? defaultValues;
  const extensionFilterChips = extensionsWithFilter.map((extension) => ({
    extension: extension,
    filterChips: contextWithDefaults[extension.id]
      ? Object.entries(contextWithDefaults[extension.id] ?? {})
          .filter(valueIsDefined)
          .map(([key, value]) => `${extension?.userArguments[key]?.title}: ${valueToString(value)}`)
      : [],
  }));

  const doSetInput = useEventCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
  });

  const doSetText = useEventCallback((text: string, conversationFiles?: FileDto[]) => {
    try {
      onSubmit(text, conversationFiles);
    } finally {
      setInput('');
    }
  });

  const doSubmit = useEventCallback((event: React.FormEvent) => {
    if (isDisabled || !input || input.length === 0 || upload.status === 'pending') {
      return;
    }
    doSetText(input, conversationFiles);
    event.preventDefault();
    void refetchConversationFiles();
  });

  const doKeyDown = useEventCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey) {
      doSubmit(event);
    }
  });

  const doUpdate = (newContext: ExtensionContext) => {
    updateContext(newContext);
    setShowFilter(false);
  };

  const deleteFile = useMutation({
    mutationFn: async (file: FileDto) => {
      return api.files.deleteUserFile(file.id);
    },
    onSuccess: () => {
      toast.success(texts.files.deleted);
    },
    onError: async (error) => {
      toast.error(await buildError(texts.files.removeFileFailed, error));
    },
    onSettled: () => refetchConversationFiles(),
  });
  const handleUploadFileFromInput = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    handleUploadFile(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFilePaste = useCallback(
    (event: ClipboardEvent) => {
      event.preventDefault();
      const items = event.clipboardData?.items;
      if (!items) {
        return;
      }

      const filesToUpload = [] as File[];
      for (let i = 0; i < items.length; i++) {
        const blob = items[i].getAsFile();

        if (!blob) {
          continue;
        }

        filesToUpload.push(blob);
      }

      handleUploadFile(filesToUpload);
    },
    [handleUploadFile],
  );

  useEffect(() => {
    window.addEventListener('paste', handleFilePaste as EventListener);

    return () => {
      window.removeEventListener('paste', handleFilePaste as EventListener);
    };
  }, [handleFilePaste]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const footer = `${configuration?.chatFooter || ''} ${theme.chatFooter || ''}`.trim();
  return (
    <>
      <div className="flex flex-col gap-2">
        {fullFileSlots?.map((slot, index) => (
          <div className="text-sm text-gray-500" key={index}>
            {texts.common.uploadLimit(slot.maxFiles, slot.extensionTitle)}
          </div>
        ))}

        {isEmpty && <Suggestions configuration={configuration} theme={theme} onSelect={doSetText} />}

        <div className="flex flex-wrap gap-2">
          {conversationFiles.map((file) => (
            <FileItem key={file.id} file={file} onRemove={() => deleteFile.mutate(file)} />
          ))}
          {uploadingFiles.map((file) => (
            <FileItem key={file.name} file={{ fileName: file.name }} loading={true} />
          ))}
        </div>

        {extensionFilterChips.map(
          (x, index) =>
            x.filterChips?.length > 0 && (
              <div key={index} className="">
                <div className="flex flex-wrap gap-2">
                  {x.filterChips.map((item) => (
                    <div
                      className="cursor-pointer rounded-lg bg-gray-100 px-2 py-1 font-mono text-[0.7rem] hover:opacity-60"
                      onClick={() => setShowFilter(true)}
                      key={item}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ),
        )}
        <form onSubmit={doSubmit}>
          <div className="box-border rounded-2xl border border-gray-200 p-4 pb-3 leading-none shadow-2xl shadow-gray-100 focus-within:border-gray-400">
            <TextareaAutosize
              className={`w-full resize-none bg-transparent pb-4 outline-none`}
              maxRows={5}
              minRows={1}
              value={input}
              autoFocus
              onChange={doSetInput}
              onKeyDown={doKeyDown}
              placeholder={texts.chat.placeholder(configuration?.name ?? '')}
              ref={textarea}
            />
            <div className="flex w-full justify-between gap-2">
              <div className="flex items-center gap-2">
                {userBucket?.extensions && userBucket.extensions.length > 0 && (
                  <>
                    <input
                      type="file"
                      id="file-upload"
                      data-testid="file-upload"
                      ref={fileInputRef}
                      className="hidden"
                      multiple={multiple}
                      onChange={handleUploadFileFromInput}
                      accept={allowedFileNameExtensions?.join(', ') ?? undefined}
                      disabled={uploadLimitReached}
                    />
                    <label
                      htmlFor="file-upload"
                      className={`cursor-pointer ${uploadLimitReached ? 'pointer-events-none opacity-50' : ''}`}
                    >
                      <ActionIcon
                        component="div"
                        size="lg"
                        variant="outline"
                        color="black"
                        disabled={uploadLimitReached}
                        className={`cursor-pointer border-gray-200 ${uploadLimitReached ? 'pointer-events-none opacity-50' : ''}`}
                      >
                        <IconPaperclip className="w-4" />
                      </ActionIcon>
                    </label>
                  </>
                )}
                {configuration?.extensions?.some(isExtensionWithUserArgs) && (
                  <Button
                    leftSection={<IconFilter className="w-4" />}
                    variant="outline"
                    type="button"
                    onClick={() => setShowFilter(true)}
                    className="border-gray-200"
                  >
                    Filters
                  </Button>
                )}
              </div>
              <ActionIcon
                type="submit"
                size={'lg'}
                disabled={!input || isDisabled || uploadMutations.some((m) => m.status === 'pending')}
                data-testid="chat-submit-button"
              >
                <Icon icon="arrow-up" />
              </ActionIcon>
            </div>
          </div>
        </form>

        {footer && <Markdown className={'mx-auto text-center text-xs text-gray-400'}>{footer}</Markdown>}
      </div>
      {showFilter && (
        <Portal>
          <FilterModal
            onClose={() => setShowFilter(false)}
            extensions={extensionsWithFilter}
            onSubmit={doUpdate}
            values={context}
            defaultValues={defaultValues}
          />
        </Portal>
      )}
    </>
  );
}
