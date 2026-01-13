import { Button, Tabs } from '@mantine/core';
import { IconEdit } from '@tabler/icons-react';
import { useEffect, useRef } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { Route, Routes } from 'react-router-dom';

import { CollapseButton, ProfileButton } from 'src/components';
import { NavigationBar } from 'src/components/NavigationBar';
import { PdfViewer } from 'src/components/PdfViewer';
import { useSidebarState, useTheme } from 'src/hooks';
import { useConversationFiles } from 'src/hooks/api/files';
import { useListOfAllAssistantsInit, useListOfEnabledAssistantsInit } from 'src/pages/chat/state/listOfAssistants';
import { texts } from 'src/texts';
import { isMobile } from '../utils';
import { ConversationItems } from './ConversationItems';
import { NewChatRedirect } from './NewChatRedirect';
import { SourcesChunkPreview } from './SourcesChunkPreview';
import { ConversationPage } from './conversation/ConversationPage';
import { Files } from './files/Files';
import {
  useStateOfSelectedAssistantId,
  useStateOfSelectedChatId,
  useStateOfSelectedDocument,
  useStateOfSelectedSource,
} from './state/chat';
import { useListOfChatsInit, useMutateNewChat, useStateMutateRemoveAllChats, useStateOfChatEmptiness } from './state/listOfChats';
import { useUserBucket } from './useUserBucket';

const CustomResizeHandle = () => (
  <Separator className="group ml-[-2px] flex w-2 items-center bg-gray-100 p-[2px] transition-all hover:bg-gray-200">
    <div className="h-6 w-full rounded group-hover:bg-white" />
  </Separator>
);

const getPanelSizes = (isRightPanelOpen: boolean) => {
  const leftBarRatio = 15;
  const rightBarRatio = 20;
  const contentRatio = 100 - leftBarRatio - (isRightPanelOpen ? rightBarRatio : 0);
  const isMobileView = isMobile();
  const mobileSideBarRatio = 90;
  const mobileContentRatio = 100 - mobileSideBarRatio;

  return {
    left: {
      defaultSize: (isMobileView ? mobileSideBarRatio : leftBarRatio) + '%',
      minSize: (isMobileView ? mobileSideBarRatio : 10) + '%',
      maxSize: (isMobileView ? mobileSideBarRatio : 40) + '%',
    },
    content: {
      defaultSize: (isMobileView ? mobileContentRatio : contentRatio) + '%',
      minSize: (isMobileView ? mobileContentRatio : 40) + '%',
    },
    right: {
      defaultSize: (isMobileView ? mobileSideBarRatio : rightBarRatio) + '%',
      minSize: (isMobileView ? mobileSideBarRatio : 10) + '%',
      maxSize: (isMobileView ? mobileSideBarRatio : 40) + '%',
    },
  };
};

export function ChatPage() {
  const { theme } = useTheme();

  const isMobileView = isMobile();
  useListOfEnabledAssistantsInit();
  useListOfAllAssistantsInit();
  useListOfChatsInit();

  const { selectedDocument, setSelectedDocument } = useStateOfSelectedDocument();
  const { selectedSource, setSelectedSource } = useStateOfSelectedSource();

  const isSourceAvailable = selectedSource?.document?.downloadAvailable ?? false;

  const selectedAssistantId = useStateOfSelectedAssistantId();
  const { userBucket } = useUserBucket(selectedAssistantId);
  const checkIfEmptyChat = useStateOfChatEmptiness();
  const selectedChatId = useStateOfSelectedChatId();
  const removeAllChats = useStateMutateRemoveAllChats();
  const createNewChat = useMutateNewChat();

  const [sidebarLeft, setSidebarLeft] = useSidebarState('sidebar-left');
  const [sidebarRight, setSidebarRight] = useSidebarState('sidebar-right');
  const rightPanelVisible = !!(sidebarRight && selectedChatId && (userBucket || selectedDocument));
  const panelSizes = getPanelSizes(rightPanelVisible);

  const { clear: clearBucketFiles } = useConversationFiles(selectedChatId);

  useEffect(() => {
    clearBucketFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userBucket]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const openNewChatIfNeeded = async () => {
    if (selectedChatId) {
      if (await checkIfEmptyChat(selectedChatId)) textareaRef.current?.focus();
      else createNewChat.mutate(selectedAssistantId);
    }
  };

  // close the sources tab everytime the user selects another conversation
  useEffect(() => {
    setSelectedDocument(undefined);
    setSelectedSource(undefined);
  }, [selectedChatId, setSelectedDocument, setSelectedSource]);

  return (
    <div className="flex h-screen flex-col">
      <NavigationBar theme={theme} />
      <Group orientation="horizontal">
        {sidebarLeft && (
          <>
            <Panel
              className="chat-conversations flex w-64 shrink-0 flex-col overflow-hidden bg-gray-100"
              id="left"
              style={{ overflow: 'auto' }}
              onClick={() => {
                if (isMobileView) setSidebarLeft(false);
              }}
              {...panelSizes.left}
            >
              <div className="p-2">
                <Button
                  className="justify-start"
                  variant="subtle"
                  p="xs"
                  onClick={openNewChatIfNeeded}
                  fullWidth
                  justify="space-between"
                  rightSection={<IconEdit className="w-4" />}
                >
                  {texts.chat.newChat}
                </Button>
              </div>

              <div className="grow overflow-y-auto p-2">
                <ConversationItems />
              </div>
              <div className="p-2" onClick={(e) => e.stopPropagation()}>
                <ProfileButton section="chat" onClearConversations={removeAllChats.mutate} />
              </div>
            </Panel>
            {!isMobileView && <CustomResizeHandle />}
          </>
        )}

        <Panel id="center" {...panelSizes.content}>
          <div className="chat-main relative min-h-0 grow overflow-hidden">
            {isMobileView && (rightPanelVisible || sidebarLeft) ? (
              <div
                className="h-screen w-screen bg-gray-300"
                onClick={() => (sidebarLeft ? setSidebarLeft(!sidebarLeft) : setSidebarRight(!sidebarRight))}
              ></div>
            ) : (
              <Routes>
                <Route path="" element={<NewChatRedirect />} />
                <Route path=":id" element={<ConversationPage textareaRef={textareaRef} />} />
              </Routes>
            )}
            {(!isMobileView || !rightPanelVisible) && (
              <CollapseButton
                className="left absolute top-[40%]"
                side="left"
                isToggled={!sidebarLeft}
                onClick={() => setSidebarLeft(!sidebarLeft)}
                tooltip={
                  sidebarLeft ? texts.common.hide(texts.common.conversations) : texts.common.show(texts.common.conversations)
                }
              />
            )}
            {(!isMobileView || !sidebarLeft) && userBucket && (
              <CollapseButton
                className="absolute top-[40%] right-2"
                side="right"
                isToggled={!sidebarRight}
                onClick={() => setSidebarRight(!sidebarRight)}
                tooltip={
                  sidebarRight
                    ? texts.common.hide(selectedDocument ? texts.chat.sources.content : texts.common.files)
                    : texts.common.show(selectedDocument ? texts.chat.sources.content : texts.common.files)
                }
              />
            )}
          </div>
        </Panel>
        {rightPanelVisible && (
          <>
            {!isMobileView && <CustomResizeHandle />}
            <Panel style={{ overflow: 'auto' }} id="right" {...panelSizes.right} className="bg-gray-100">
              {selectedDocument ? (
                <Tabs defaultValue="sources-chunk-preview">
                  <Tabs.List>
                    <Tabs.Tab value="sources-chunk-preview">{texts.chat.sources.content}</Tabs.Tab>
                    <Tabs.Tab value="source-document-viewer" hidden={!isSourceAvailable}>
                      {texts.chat.sources.viewer}
                    </Tabs.Tab>
                  </Tabs.List>

                  <Tabs.Panel value="sources-chunk-preview">
                    <SourcesChunkPreview onClose={() => setSelectedDocument(undefined)} document={selectedDocument} />
                  </Tabs.Panel>
                  {isSourceAvailable && (
                    <Tabs.Panel value="source-document-viewer">
                      <PdfViewer
                        selectedDocument={selectedDocument}
                        selectedSource={selectedSource}
                        onClose={() => setSelectedDocument(undefined)}
                      />
                    </Tabs.Panel>
                  )}
                </Tabs>
              ) : (
                userBucket && (
                  <Files configurationId={selectedAssistantId} userBucket={userBucket} conversationId={selectedChatId} />
                )
              )}
            </Panel>
          </>
        )}
      </Group>
    </div>
  );
}
