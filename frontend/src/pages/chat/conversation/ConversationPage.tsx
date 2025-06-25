import { ActionIcon } from '@mantine/core';
import { IconArrowDown } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FileDto, ResponseError, useApi } from 'src/api';
import { useEventCallback, useTheme } from 'src/hooks';
import { cn } from 'src/lib';
import { texts } from 'src/texts';
import { useScrollToBottom } from '../../../hooks/useScrollToBottom';
import { useAIConversation, useChatStore } from '../state';
import { useChatDropzone } from '../useChatDropzone';
import { ChatHistory } from './ChatHistory';
import { ChatInput } from './ChatInput';
import { Configuration } from './Configuration';
import { ConversationRating } from './ConversationRating';
import { DragAndDropLayout } from './DragAndDropLayout/DragAndDropLayout';

const transformMimeTypes = (mimeTypes: string[]) => Object.fromEntries(mimeTypes.map((type) => [type, []]));

interface ConversationPageProps {
  onConfigurationSelected: (configurationId: number) => void;
  onConversationSelected: (conversationId: number) => void;
  selectedConfigurationId: number;
  selectDocument: (conversationId: number, messageId: number, documentUri: string) => void;
}

export function ConversationPage(props: ConversationPageProps) {
  const { onConversationSelected, selectedConfigurationId, onConfigurationSelected, selectDocument } = props;
  const api = useApi();

  const { theme } = useTheme();
  const conversationParam = useParams<'id'>();
  const conversationId = +conversationParam.id!;
  const { conversation, messages, isAiWritting, setConversation, setMessages } = useChatStore();
  const { canScrollToBottom, scrollToBottom, containerRef } = useScrollToBottom([conversation.id], [messages]);
  const { sendMessage } = useAIConversation();
  const navigate = useNavigate();

  const { data: loadedConversationAndMessages, error } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: async () => {
      return {
        conversation: await api.conversations.getConversation(conversationId),
        messages: await api.conversations.getMessages(conversationId),
      };
    },
    refetchOnWindowFocus: false,
    retry: (failureCount, error: ResponseError) =>
      // if we receive 404 or 403 from the server, then don't retry. Otherwise retry 3 times (default behavior).
      error?.response?.status !== 404 && error?.response?.status !== 403 && failureCount < 3,
  });
  useEffect(() => {
    if (error) {
      if (error.response.status === 403) {
        toast.error(texts.chat.noAccessToConversation);
        void navigate('/chat');
      } else if (error.response.status === 404) {
        toast.error(texts.chat.conversationNotFound);
        void navigate('/chat');
      } else {
        toast.error(`${texts.chat.errorLoadingMessagesOrConversation} ${texts.common.reloadAndTryAgain}`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  const { data: loadedConfigurations } = useQuery({
    queryKey: ['enabled-configurations'],
    queryFn: () => api.extensions.getConfigurations(true),
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (loadedConversationAndMessages) {
      setMessages(loadedConversationAndMessages.messages.items);
      setConversation(loadedConversationAndMessages.conversation);
      onConversationSelected(loadedConversationAndMessages.conversation.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedConversationAndMessages, setConversation]);

  const configurations = useMemo(() => {
    return loadedConfigurations?.items || [];
  }, [loadedConfigurations]);

  const isNewConversation = messages.length === 0 && !!history;

  const configuration = useMemo(() => {
    return (
      configurations.find((x) => x.id === conversation.configurationId) ||
      configurations.find((x) => x.id === selectedConfigurationId) ||
      configurations[0]
    );
  }, [selectedConfigurationId, configurations, conversation.configurationId]);

  const llmLogo = configuration?.extensions?.find((x) => x.type === 'llm')?.logo;

  useEffect(() => {
    if (configuration) {
      onConfigurationSelected(configuration.id);
    }
  }, [onConfigurationSelected, configuration]);

  const agentName = useMemo(() => {
    return configuration?.agentName || theme.agentName || texts.chat.sourceAI;
  }, [configuration?.agentName, theme.agentName]);

  const doSubmit = useEventCallback((input: string, uploadedFiles?: FileDto[], editMessageId?: number) => {
    sendMessage(conversationId, input, uploadedFiles, editMessageId);
    setTimeout(() => scrollToBottom(), 500);
    return false;
  });
  const { uploadLimitReached, allowedFileNameExtensions, handleUploadFile, multiple } = useChatDropzone(
    selectedConfigurationId,
    conversationId,
  );
  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } = useDropzone({
    multiple,
    onDrop: handleUploadFile,
    accept: transformMimeTypes(allowedFileNameExtensions),
    noClick: true,
  });

  const isConversationLoading =
    !conversation || conversation.id !== conversationId || conversation.id !== loadedConversationAndMessages?.conversation.id;
  const showRateThisConversation =
    loadedConversationAndMessages && !loadedConversationAndMessages?.conversation?.rating && messages.length > 10;
  const showScrollToBottomButton = canScrollToBottom && !isAiWritting;
  return (
    <div className={'relative mx-auto flex flex-col pb-2'} style={{ height: 'calc(100vh - 48px)' }} {...getRootProps()}>
      <input {...getInputProps()} className="hidden" />
      {isDragActive && (
        <>
          {isDragAccept && <>{uploadLimitReached ? <DragAndDropLayout.UploadLimitReached /> : <DragAndDropLayout.Accept />}</>}
          {isDragReject && <DragAndDropLayout.InvalidFileFormat allowedFileNameExtensions={allowedFileNameExtensions} />}
        </>
      )}
      <div className="bg-white p-3">
        <Configuration
          canEditConfiguration={isNewConversation}
          conversation={conversation}
          configuration={configuration}
          configurations={configurations}
          onConversationChange={setConversation}
        />
      </div>
      {isConversationLoading ? (
        <div className="fade-in w-full bg-white" style={{ height: 'calc(100vh - 4rem)' }} />
      ) : (
        <>
          {messages.length > 0 && (
            <div
              className={
                'fade-in overflow-anchor-none mx-auto box-border w-full max-w-[min(800px,_100%)] grow overflow-auto px-4'
              }
              ref={containerRef}
            >
              <ChatHistory
                agentName={agentName}
                conversationId={conversation.id}
                messages={messages}
                isWriting={isAiWritting}
                llmLogo={llmLogo}
                selectDocument={selectDocument}
                onSubmit={doSubmit}
              />
            </div>
          )}
          <div className={`${!messages.length && 'grow'} flex shrink-0 flex-col items-center justify-center px-4`}>
            {!messages.length && <h2 className="mb-6 text-center text-3xl font-bold">{texts.chat.welcomeText}</h2>}
            <div
              className={cn(
                'fade-in relative mx-auto w-full max-w-[800px]',
                (showScrollToBottomButton || showRateThisConversation) && 'white-shadow',
              )}
            >
              <ChatInput
                conversationId={conversation.id}
                configuration={configuration}
                isDisabled={isAiWritting}
                isEmpty={isNewConversation}
                onSubmit={doSubmit}
              />
              <div
                data-testid={'scrollToBottomButton'}
                className={cn(
                  'absolute inset-x-0 top-0 flex w-full -translate-y-full justify-center p-2 opacity-0 transition-all',
                  showScrollToBottomButton ? 'fade-in opacity-100 delay-200' : 'pointer-events-none opacity-0',
                )}
                onClick={() => scrollToBottom()}
              >
                <ActionIcon>
                  <IconArrowDown className="w-4" />
                </ActionIcon>
              </div>
              <div
                className={cn(
                  'absolute inset-x-0 top-0 flex w-full -translate-y-full justify-center p-2 transition-all delay-1000',
                  showRateThisConversation ? 'fade-in opacity-100 delay-200' : 'hidden opacity-0',
                )}
              >
                <ConversationRating key={conversationId} conversation={loadedConversationAndMessages.conversation} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
